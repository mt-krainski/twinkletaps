#!/bin/bash

# Build and Upload Script
# Main orchestrator that runs the complete build and upload process
#
# This script runs all the individual scripts in the correct order:
# 1. Compile sketch
# 2. Upload to board

set -e  # Exit on any error

echo "🚀 Build and Upload"
echo "==================="
echo ""

# Step 1: Compile sketch
echo "🔧 Step 1: Compiling sketch..."
./scripts/compile.sh "$@"
echo ""

# Step 2: Upload to board
echo "📤 Step 2: Uploading to board..."
./scripts/upload.sh "$@"
echo ""

echo "🎉 Build and upload completed successfully!"
echo ""
echo " Monitor serial output with: ./scripts/monitor.sh"
