#!/bin/bash

# Upload Script
# Uploads the compiled Arduino sketch to the discovered board

set -e  # Exit on any error

# Resolve project
source "$(dirname "$0")/_resolve_project.sh"

echo "📤 Uploading $PROJECT_NAME"
echo "============================"

# Check if board information is available
if [ ! -f ".board_port" ] || [ ! -f ".board_fqbn" ]; then
    echo "❌ Board information not found."
    echo "   Please run the board discovery script first:"
    echo "   ./scripts/init.sh [board name]"
    exit 1
fi

PORT=$(cat .board_port)
FQBN=$(cat .board_fqbn)

echo "✅ Using board:"
echo "   Port: $PORT"
echo "   FQBN: $FQBN"

# Check if the board is still connected
if ! arduino-cli board list --format json | jq -r '.detected_ports[] | .port.address' | grep -q "$PORT"; then
    echo "❌ Board not found on port $PORT"
    echo ""
    echo "The board may have been disconnected. Please:"
    echo "  1. Check the USB connection"
    echo "  2. Run board discovery again: ./scripts/init.sh [board name]"
    exit 1
fi

echo "✅ Board is still connected"

# Upload the sketch
echo ""
echo "📤 Uploading to board..."
echo "   This may take a moment..."

if arduino-cli upload --fqbn "$FQBN" --port "$PORT" "$PROJECT_DIR"; then
    echo ""
    echo "✅ Upload successful!"
    echo ""
    echo "🎉 Your $PROJECT_NAME is now running on the board!"
    echo ""
    echo "💡 You can monitor the serial output with:"
    echo "   arduino-cli monitor --port $PORT --config baudrate=115200"
    echo ""
    echo "   Or use the monitor script:"
    echo "   ./scripts/monitor.sh"
else
    echo ""
    echo "❌ Upload failed!"
    echo ""
    echo "Troubleshooting:"
    echo "  - Make sure the board is connected and the port is correct"
    echo "  - Try pressing the reset button on the board"
    echo "  - Check if another program is using the serial port"
    echo "  - Try unplugging and reconnecting the board"
    echo "  - Run board discovery again: ./scripts/init.sh [board name]"
    exit 1
fi
