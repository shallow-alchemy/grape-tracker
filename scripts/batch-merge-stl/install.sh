#!/bin/bash

echo "Building batch-merge-stl..."
cargo build --release

if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo ""
    echo "To install globally, run:"
    echo "  cargo install --path ."
    echo ""
    echo "Or use the binary directly from:"
    echo "  ./target/release/batch-merge-stl"
else
    echo "Build failed!"
    exit 1
fi
