#!/usr/bin/env bash

# This script prepares the root-level .env with configuration
# needed by multiple packages (HiveMQ, Jira, workflow).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

generate_secret() {
  openssl rand -base64 32
}

if [ ! -f "$ENV_FILE" ]; then
  AUTH_SECRET=$(generate_secret)
  PUBLISHER_PASS=$(generate_secret)

  cat > "$ENV_FILE" <<EOL
# Jira
JIRA_URL=
JIRA_USERNAME=
JIRA_API_TOKEN=

JIRA_AGENT_USERNAME=

BASE_BRANCH=
HUMAN_ATLASSIAN_ID=

# HiveMQ auth extension — passed to Docker Compose container
TWINKLETAPS_AUTH_URL=http://host.docker.internal:3000/api/mqtt/auth
TWINKLETAPS_AUTH_SECRET=${AUTH_SECRET}

# MQTT auth — used by the Next.js backend auth endpoint
# Must match TWINKLETAPS_AUTH_SECRET above
MQTT_AUTH_SECRET=${AUTH_SECRET}

# MQTT publisher — server-side credentials for the app to publish messages
MQTT_PUBLISHER_USERNAME=dev-publisher
MQTT_PUBLISHER_PASSWORD=${PUBLISHER_PASS}
EOL
  echo "Created $ENV_FILE with generated secrets"
else
  echo "$ENV_FILE already exists, skipping"
fi
