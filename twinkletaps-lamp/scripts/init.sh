#!/bin/bash

# Board Discovery Script
# Automatically discovers Arduino boards and extracts port/FQBN information
#
# Usage: ./scripts/init.sh [--project PROJECT_NAME] [board_name]
#   --project: Optional. Set the active project and write it to .active_project
#   board_name: String to match in board name (default: "Arduino UNO R4 WiFi")

set -e  # Exit on any error

# Parse arguments
PROJECT_NAME=""
BOARD_NAME=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_NAME="$2"
      shift 2
      ;;
    *)
      BOARD_NAME="$1"
      shift
      ;;
  esac
done

# Set default board name if not provided
if [ -z "$BOARD_NAME" ]; then
  BOARD_NAME="Arduino UNO R4 WiFi"
fi

# If project name is provided, write it to .active_project
if [ -n "$PROJECT_NAME" ]; then
  echo "📝 Setting active project: $PROJECT_NAME"
  echo "$PROJECT_NAME" > .active_project
  echo "✅ Active project set to $PROJECT_NAME"
  echo ""
fi

echo "🔍 Discovering Arduino Board"
echo "============================"
echo "Looking for: $BOARD_NAME"
echo ""

# Check if arduino-cli is installed
if ! command -v arduino-cli &> /dev/null; then
    echo "❌ arduino-cli is not installed. Please install it first."
    exit 1
fi

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "❌ jq is not installed. Please install it for JSON parsing:"
    echo "  macOS: brew install jq"
    echo "  Linux: sudo apt-get install jq"
    echo "  Windows: https://stedolan.github.io/jq/download/"
    exit 1
fi

echo "✅ arduino-cli and jq found"

# Get board list and look for matching board
echo ""
echo "🔍 Scanning for Arduino boards..."

# Check if any boards are detected
BOARD_COUNT=$(arduino-cli board list --format json | jq '.detected_ports | length')

if [ "$BOARD_COUNT" -eq 0 ]; then
    echo "❌ No Arduino boards detected."
    echo ""
    echo "Troubleshooting:"
    echo "  - Make sure your Arduino is connected via USB"
    echo "  - Try a different USB cable"
    echo "  - Check if the board is powered on"
    echo "  - Try unplugging and reconnecting the board"
    exit 1
fi

echo "✅ Found $BOARD_COUNT connected device(s)"

# Look for specified board
MATCH_COUNT=$(arduino-cli board list --format json | jq ".detected_ports[] | select(.matching_boards) | .matching_boards[] | select(.name | contains(\"$BOARD_NAME\")) | .name" | wc -l)

if [ "$MATCH_COUNT" -eq 0 ]; then
    echo "❌ No board matching '$BOARD_NAME' found."
    echo ""
    echo "Available boards:"
    arduino-cli board list
    echo ""
    echo "Try specifying a different board name:"
    echo "  ./scripts/init.sh 'Arduino UNO R4 WiFi'"
    echo "  ./scripts/init.sh 'Arduino Uno'"
    exit 1
fi

echo "✅ Found board matching '$BOARD_NAME'"

# Extract port and FQBN
PORT=$(arduino-cli board list --format json | jq -r ".detected_ports[] | select(.matching_boards) | select(.matching_boards[].name | contains(\"$BOARD_NAME\")) | .port.address" | head -1)
FQBN=$(arduino-cli board list --format json | jq -r ".detected_ports[] | select(.matching_boards) | .matching_boards[] | select(.name | contains(\"$BOARD_NAME\")) | .fqbn" | head -1)

if [ -z "$PORT" ] || [ "$PORT" = "null" ]; then
    echo "❌ Could not extract port information"
    exit 1
fi

if [ -z "$FQBN" ] || [ "$FQBN" = "null" ]; then
    echo "❌ Could not extract FQBN information"
    exit 1
fi

echo ""
echo "✅ Board Information:"
echo "   Port: $PORT"
echo "   FQBN: $FQBN"
echo "   Board: $BOARD_NAME"

# Output for use by other scripts
echo "$PORT" > .board_port
echo "$FQBN" > .board_fqbn

echo ""
echo "🎉 Board discovery completed successfully!"
