#!/bin/bash
# PreToolUse hook: reject Write/Edit operations targeting files outside $CLAUDE_PROJECT_DIR.

FILE_PATH=$(jq -r '.tool_input.file_path // empty' < /dev/stdin)

# If no file_path in the input, let it through (not a file operation)
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Resolve to absolute path for comparison
RESOLVED=$(cd "$CLAUDE_PROJECT_DIR" && realpath -m "$FILE_PATH" 2>/dev/null || echo "$FILE_PATH")
PROJECT_DIR=$(realpath "$CLAUDE_PROJECT_DIR")

CLAUDE_DIR=$(realpath "$HOME/.claude" 2>/dev/null || echo "$HOME/.claude")

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
