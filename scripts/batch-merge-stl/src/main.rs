use clap::Parser;
use colored::*;
use glob::glob;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs::{self, File};
use std::io::BufReader;
use stl_io::{read_stl, write_stl, Triangle, Vector};

#[derive(Parser)]
#[command(
    name = "batch-merge-stl",
    about = "Batch merge STL files with a base STL and output as 3MF",
    long_about = None,
    after_help = "EXAMPLES:\n    \
        batch-merge-stl -b assets/VineTagBase.stl .\n    \
        batch-merge-stl -b assets/VineTagBase.stl -p \"vine-*.stl\" downloads/\n    \
        batch-merge-stl -b assets/VineTagBase.stl -o ready-to-print/ downloads/"
)]
struct Args {
    #[arg(help = "Directory containing STL files to merge")]
    input_dir: PathBuf,

    #[arg(
        short = 'b',
        long = "base",
        help = "Base STL file to merge with each input file"
    )]
    base: PathBuf,

    #[arg(
        short = 'o',
        long = "output",
        help = "Output directory for 3MF files (default: same as input directory)"
    )]
    output: Option<PathBuf>,

    #[arg(
        short = 'p',
        long = "pattern",
        default_value = "*.stl",
        help = "File pattern to match"
    )]
    pattern: String,

    #[arg(
        short = 's',
        long = "scale-base",
        help = "Scale factor for base STL (e.g., 25.4 to convert inches to mm)"
    )]
    scale_base: Option<f32>,
}

fn main() {
    let args = Args::parse();

    if let Err(e) = run(args) {
        eprintln!("{} {}", "Error:".red().bold(), e);
        std::process::exit(1);
    }
}

fn run(args: Args) -> Result<(), String> {
    let input_dir = args.input_dir.canonicalize()
        .map_err(|_| format!("Input directory '{}' does not exist", args.input_dir.display()))?;

    let base_stl_original = args.base.canonicalize()
        .map_err(|_| format!("Base STL file '{}' does not exist", args.base.display()))?;

    let base_stl = if let Some(scale) = args.scale_base {
        println!("Scaling base STL by {}x...", scale);
        let temp_file = std::env::temp_dir().join("scaled_base.stl");
        scale_stl_file(&base_stl_original, &temp_file, scale)?;
        println!("Base STL scaled and saved to temp file");
        temp_file
    } else {
        base_stl_original
    };

    let output_dir = match args.output {
        Some(dir) => {
            fs::create_dir_all(&dir)
                .map_err(|e| format!("Failed to create output directory: {}", e))?;
            dir.canonicalize()
                .map_err(|e| format!("Failed to resolve output directory: {}", e))?
        }
        None => input_dir.clone(),
    };

    let pattern_path = input_dir.join(&args.pattern);
    let pattern_str = pattern_path.to_str()
        .ok_or_else(|| "Invalid pattern path".to_string())?;

    let stl_files: Vec<PathBuf> = glob(pattern_str)
        .map_err(|e| format!("Invalid glob pattern: {}", e))?
        .filter_map(Result::ok)
        .collect();

    if stl_files.is_empty() {
        println!("No STL files found matching pattern '{}' in '{}'",
            args.pattern, input_dir.display());
        return Ok(());
    }

    println!("Found {} STL file(s) to process", stl_files.len());
    println!("Base STL: {}", base_stl.display());
    println!("Output directory: {}", output_dir.display());
    println!("{}", "-".repeat(60));

    let mut success_count = 0;
    let mut failed_files = Vec::new();

    for stl_file in &stl_files {
        let file_stem = stl_file.file_stem()
            .ok_or_else(|| "Invalid filename".to_string())?;

        let output_name = format!("{}.3mf", file_stem.to_string_lossy());
        let output_file = output_dir.join(&output_name);

        let file_name = stl_file.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        println!("Processing: {} -> {}", file_name, output_name);

        match merge_stl(&base_stl, stl_file, &output_file) {
            Ok(_) => {
                success_count += 1;
                println!("  {} Created: {}", "✓".green(), output_file.display());
            }
            Err(e) => {
                failed_files.push(file_name.to_string());
                println!("  {} Failed: {}", "✗".red(), e);
            }
        }
    }

    println!("{}", "-".repeat(60));
    println!("Complete: {}/{} files processed successfully",
        success_count.to_string().green().bold(),
        stl_files.len());

    if !failed_files.is_empty() {
        println!("\n{}:", "Failed files".red().bold());
        for failed in &failed_files {
            println!("  - {}", failed);
        }
        return Err(format!("{} file(s) failed to process", failed_files.len()));
    }

    Ok(())
}

fn scale_stl_file(input: &Path, output: &Path, scale: f32) -> Result<(), String> {
    let mut file = BufReader::new(File::open(input)
        .map_err(|e| format!("Failed to open STL file: {}", e))?);

    let mesh = read_stl(&mut file)
        .map_err(|e| format!("Failed to read STL file: {}", e))?;

    let triangles: Vec<Triangle> = mesh.faces.iter().map(|face| {
        let v1 = mesh.vertices[face.vertices[0]];
        let v2 = mesh.vertices[face.vertices[1]];
        let v3 = mesh.vertices[face.vertices[2]];

        Triangle {
            normal: face.normal,
            vertices: [
                Vector::new([v1[0] * scale, v1[1] * scale, v1[2] * scale]),
                Vector::new([v2[0] * scale, v2[1] * scale, v2[2] * scale]),
                Vector::new([v3[0] * scale, v3[1] * scale, v3[2] * scale]),
            ],
        }
    }).collect();

    let mut out_file = File::create(output)
        .map_err(|e| format!("Failed to create output file: {}", e))?;

    write_stl(&mut out_file, triangles.iter())
        .map_err(|e| format!("Failed to write STL file: {}", e))?;

    Ok(())
}

fn merge_stl(base: &Path, input: &Path, output: &Path) -> Result<(), String> {
    let output_result = Command::new("stlto3mf")
        .arg("--output")
        .arg(output)
        .arg(base)
        .arg(input)
        .output();

    match output_result {
        Ok(output) => {
            if output.status.success() {
                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(stderr.trim().to_string())
            }
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            Err("stlto3mf command not found. Install from: https://github.com/mpapierski/stlto3mf".to_string())
        }
        Err(e) => Err(format!("Failed to execute stlto3mf: {}", e)),
    }
}
