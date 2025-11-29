// Tell Cargo to rerun this build script when migrations change
fn main() {
    // Watch the migrations directory for changes
    println!("cargo:rerun-if-changed=migrations");
}
