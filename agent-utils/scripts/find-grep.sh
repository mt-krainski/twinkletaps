#!/bin/bash
# agent-utils/scripts/find-grep.sh
# Usage: find-grep.sh <pattern> [directory] [lines]
# Searches source files for a pattern and returns top results
#
# Examples:
#   find-grep.sh "workspace.*switch\|WorkspaceSwitcher"
#   find-grep.sh "useAuth" src/hooks 30

PATTERN="${1:?Usage: find-grep.sh <pattern> [directory] [lines]}"
DIR="${2:-src}"
LINES="${3:-20}"

find "$DIR" -type f | xargs grep -l -i "$PATTERN" 2>/dev/null | head -"$LINES"
