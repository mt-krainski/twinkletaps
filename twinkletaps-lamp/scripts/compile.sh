#!/bin/bash

# Compile Script
# Compiles the Arduino sketch for the discovered board

set -e  # Exit on any error

# Resolve project
source "$(dirname "$0")/_resolve_project.sh"

echo "🔧 Compiling $PROJECT_NAME"
echo "============================"

# Check if we're in the right directory and project exists
if [ ! -f "$PROJECT_DIR/$PROJECT_NAME.ino" ]; then
    echo "❌ $PROJECT_NAME.ino not found at $PROJECT_DIR/"
    echo "   Make sure you're in the project root directory."
    exit 1
fi

echo "✅ Found $PROJECT_NAME.ino"

# Check if board information is available
if [ ! -f ".board_fqbn" ]; then
    echo "❌ Board information not found."
    echo "   Please run the board discovery script first:"
    echo "   ./scripts/init.sh [board name]"
    exit 1
fi

FQBN=$(cat .board_fqbn)
echo "✅ Using FQBN: $FQBN"

# Ensure ca-certs.h exists (needed for TLS)
if [ ! -f "$PROJECT_DIR/ca-certs.h" ]; then
    echo ""
    echo "📜 ca-certs.h not found, fetching CA certificate..."
    "$(dirname "$0")/fetch-ca-cert.sh"
    echo ""
fi

# Compile the project
echo ""
echo "🔧 Compiling for $FQBN..."
echo "   This may take a moment..."

if arduino-cli compile --fqbn "$FQBN" "$PROJECT_DIR"; then
    echo ""
    echo "✅ Compilation successful!"
    echo "   The sketch is ready for upload"
else
    echo ""
    echo "❌ Compilation failed!"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check for syntax errors in the Arduino sketch"
    echo "  - Verify all required libraries are installed"
    echo "  - Make sure the FQBN is correct for your board"
    echo "  - Try running: ./scripts/install-deps.sh"
    exit 1
fi
