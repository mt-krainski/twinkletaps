#!/usr/bin/env bash

# This script prepares the development environment.
# It installs all relevant packages and creates a template .env file.

uv sync

pre-commit install

if [ ! -f .env ]; then
  cat > .env <<EOL
GITHUB_OWNER=
GITHUB_REPO=
TASK_BRANCH_PREFIX=
EOL
fi
