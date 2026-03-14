#!/usr/bin/env bash

# HiveMQ env vars are passed via explicit environment: block in docker-compose.yml.
# Delegate to the root configure script which seeds all env vars.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_CONFIGURE="$SCRIPT_DIR/../../scripts/configure.sh"

exec "$ROOT_CONFIGURE"
