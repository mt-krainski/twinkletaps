#!/usr/bin/env bash

# This script prepares the development environment.
# It installs all relevant packages and creates a template .env file.

uv sync

pre-commit install

if [ ! -f .env ]; then
  cat > .env <<EOL
GITHUB_OWNER=mt-krainski
GITHUB_REPO=twinkletaps
TASK_BRANCH_PREFIX=task/
EOL
fi
