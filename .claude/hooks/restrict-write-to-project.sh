#!/bin/bash
# PreToolUse hook: reject Write/Edit operations targeting files outside $CLAUDE_PROJECT_DIR.

FILE_PATH=$(jq -r '.tool_input.file_path // empty' < /dev/stdin)

# If no file_path in the input, let it through (not a file operation)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Resolve to absolute path for comparison (handles nonexistent files)
resolve_path() {
  local target="$1"
  if [[ -e "$target" ]]; then
    realpath "$target"
  else
    local dir=$(dirname "$target")
    local base=$(basename "$target")
    local resolved_dir=$(cd "$dir" 2>/dev/null && pwd)
    if [[ -n "$resolved_dir" ]]; then
      echo "$resolved_dir/$base"
    else
      echo "$target"
    fi
  fi
}

RESOLVED=$(cd "$CLAUDE_PROJECT_DIR" && resolve_path "$FILE_PATH")
PROJECT_DIR=$(realpath "$CLAUDE_PROJECT_DIR")

CLAUDE_DIR=$(realpath "$HOME/.claude" 2>/dev/null || echo "$HOME/.claude")

# Reject edits to .claude/settings.json and .claude/settings.local.json
SETTINGS_FILE="$PROJECT_DIR/.claude/settings.json"
SETTINGS_LOCAL_FILE="$PROJECT_DIR/.claude/settings.local.json"
if [[ "$RESOLVED" == "$SETTINGS_FILE" || "$RESOLVED" == "$SETTINGS_LOCAL_FILE" ]]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Editing .claude/settings files is not allowed"
    }
  }'
  exit 0
fi

if [[ "$RESOLVED" == "$PROJECT_DIR"/* || "$RESOLVED" == "$CLAUDE_DIR"/* ]]; then
  exit 0
else
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Write/Edit outside project directory is not allowed"
    }
  }'
fi
