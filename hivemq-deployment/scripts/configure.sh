#!/usr/bin/env bash

# HiveMQ env vars live in the root .env (loaded via docker-compose env_file).
# Delegate to the root configure script which seeds all env vars.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_CONFIGURE="$SCRIPT_DIR/../../scripts/configure.sh"

exec "$ROOT_CONFIGURE"
