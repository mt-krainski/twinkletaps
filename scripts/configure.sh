#!/usr/bin/env bash

# This script prepares the root-level .env with configuration
# needed by multiple packages (HiveMQ, Jira, workflow).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

if [ ! -f "$ENV_FILE" ]; then
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
TWINKLETAPS_AUTH_SECRET=

# MQTT auth — used by the Next.js backend auth endpoint
# Must match TWINKLETAPS_AUTH_SECRET above
MQTT_AUTH_SECRET=

# MQTT publisher — server-side credentials for the app to publish messages
MQTT_PUBLISHER_USERNAME=
MQTT_PUBLISHER_PASSWORD=
EOL
  echo "Created $ENV_FILE"
else
  echo "$ENV_FILE already exists, skipping"
fi
