#!/bin/bash

# Install Dependencies Script
# Installs all required Arduino libraries for all projects

set -e  # Exit on any error

echo "📚 Installing Arduino Dependencies"
echo "==================================="

# Check if arduino-cli is installed
if ! command -v arduino-cli &> /dev/null; then
    echo "❌ arduino-cli is not installed."
    echo ""
    echo "Please install it first:"
    echo "  macOS: brew install arduino-cli"
    echo "  Linux: https://arduino.github.io/arduino-cli/latest/installation/"
    echo "  Windows: https://arduino.github.io/arduino-cli/latest/installation/"
    exit 1
fi

echo "✅ arduino-cli found"

# Install arduino:renesas_uno platform (for Arduino UNO R4 WiFi)
echo ""
echo "📦 Installing arduino:renesas_uno platform..."
if arduino-cli core install "arduino:renesas_uno"; then
    echo "✅ arduino:renesas_uno platform installed successfully"
else
    echo "❌ Failed to install arduino:renesas_uno platform"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check your internet connection"
    echo "  - Try running: arduino-cli core update-index"
    echo "  - Verify the platform name is correct"
    exit 1
fi

# Install ArduinoJson library
echo ""
echo "📦 Installing ArduinoJson library..."
if arduino-cli lib install "ArduinoJson"; then
    echo "✅ ArduinoJson library installed successfully"
else
    echo "❌ Failed to install ArduinoJson library"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check your internet connection"
    echo "  - Try running: arduino-cli lib update"
    echo "  - Verify the library name is correct"
    exit 1
fi

# Install ArduinoMqttClient library
echo ""
echo "📦 Installing ArduinoMqttClient library..."
if arduino-cli lib install "ArduinoMqttClient"; then
    echo "✅ ArduinoMqttClient library installed successfully"
else
    echo "❌ Failed to install ArduinoMqttClient library"
    echo ""
    echo "Troubleshooting:"
    echo "  - Check your internet connection"
    echo "  - Try running: arduino-cli lib update"
    echo "  - Verify the library name is correct"
    exit 1
fi

echo ""
echo "🎉 All dependencies installed successfully!"
echo "   Ready to compile and upload projects"
