#!/bin/bash

# Monitor Script
# Opens serial monitor to view debug output from the TwinkletapsLamp

set -e  # Exit on any error

echo "📺 Opening Serial Monitor"
echo "========================="

# Check if board information is available
if [ ! -f ".board_port" ]; then
    echo "❌ Board information not found."
    echo "   Please run the board discovery script first:"
    echo "   ./scripts/init.sh [board name]"
    exit 1
fi

PORT=$(cat .board_port)

echo "✅ Using port: $PORT"
echo ""

# Check if the board is still connected
if ! arduino-cli board list --format json | jq -r '.detected_ports[] | .port.address' | grep -q "$PORT"; then
    echo "❌ Board not found on port $PORT"
    echo ""
    echo "The board may have been disconnected. Please:"
    echo "  1. Check the USB connection"
    echo "  2. Run board discovery again: ./scripts/init.sh [board name]"
    exit 1
fi

echo "✅ Board is connected"
echo ""
echo "📺 Opening serial monitor..."
echo "   Baud rate: 115200"
echo "   Press Ctrl+C to exit"
echo ""

# Open serial monitor
arduino-cli monitor --port "$PORT" --config baudrate=115200
