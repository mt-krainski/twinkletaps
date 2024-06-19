#!/usr/bin/env bash

# This script prepares the development envrionment.
# It installs all relevant plugins, additional packages
# and creates a template .env file.

poetry -q self add poetry-plugin-dotenv

cat > .env <<EOL
DJANGO_SETTINGS_MODULE="settings.core"
DJANGO_SECRET_KEY=$(poe -q generate-secret)
EOL
