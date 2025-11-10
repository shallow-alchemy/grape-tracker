# Batch Merge STL

A command-line tool for batch merging STL files with a base STL and outputting as 3MF files.

## Installation

```bash
# Build and install
cargo install --path .

# Or build only
cargo build --release
# Binary will be at: target/release/batch-merge-stl
```

## Usage

```bash
# Basic usage - scale base from inches to mm
batch-merge-stl -b assets/Base.stl -s 25.4 .

# Process specific directory with custom output
batch-merge-stl -b assets/Base.stl -s 25.4 -o ready-to-print/ downloads/

# Filter by pattern
batch-merge-stl -b assets/Base.stl -s 25.4 -p "vine-*.stl" downloads/
```

## Options

- `input_dir` - Directory containing STL files to merge (required)
- `-b, --base` - Base STL file to merge with each input file (required)
- `-s, --scale-base` - Scale factor for base STL (e.g., 25.4 to convert inches to mm)
- `-o, --output` - Output directory for 3MF files (default: same as input directory)
- `-p, --pattern` - File pattern to match (default: `*.stl`)

## Examples

```bash
# Process vine tags (scale base from inches to mm)
batch-merge-stl -b assets/Base.stl -s 25.4 -p "vine-*-qr.stl" downloads/

# Process block tags to separate output folder
batch-merge-stl -b assets/Base.stl -s 25.4 -p "block-*.stl" -o print-queue/ tags/

# Process all STL files in a directory
batch-merge-stl -b assets/Base.stl -s 25.4 downloads/

# If base is already in mm, no scaling needed
batch-merge-stl -b assets/Base-mm.stl downloads/
```

## Requirements

- Rust 1.70+
- [stlto3mf](https://github.com/mpapierski/stlto3mf) command-line tool

## How It Works

For each STL file in the input directory:
1. Optionally scales the base STL file (e.g., inches to mm conversion)
2. Merges scaled base with input STL using `stlto3mf`
3. Outputs a `.3mf` file with the same base name
4. Reports success/failure for each file
5. Provides summary statistics

Input: `vine-A-001-qr.stl` → Output: `vine-A-001.3mf`
