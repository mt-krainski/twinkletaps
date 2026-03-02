#!/usr/bin/env bash

# This script prepares the development environment.
# It installs all relevant packages and creates a template .env file.

uv sync

cat > .env <<EOL
JIRA_AGENT_USERNAME=
HUMAN_ATLASSIAN_ID=
BASE_BRANCH=
EOL
