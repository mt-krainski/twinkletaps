#!/bin/bash
# agent-utils/scripts/run-with-tail.sh
# Usage: run-with-tail.sh <lines> <cmd> [args...]
LINES=$1
shift
"$@" 2>&1 | tail -n "$LINES"
