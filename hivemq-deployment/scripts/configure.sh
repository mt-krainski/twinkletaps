#!/usr/bin/env bash

# This script prepares the hivemq-deployment environment.
# It creates a template .env file with MQTT broker configuration.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOL
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_WS_URL=ws://localhost:8000/mqtt
EOL
  echo "Created $ENV_FILE"
else
  echo "$ENV_FILE already exists, skipping"
fi
