#!/bin/bash
# PreToolUse hook: approve Bash commands that glob-based permissions can't match.
# Handles multiline args, paths with glob metacharacters (parentheses, brackets), etc.

set -f  # Disable glob expansion — paths may contain [], (), etc.

COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

# Patterns to allow (prefix matches via == "prefix"*)
ALLOWED_PREFIXES=(
  "git add "
  "jira-utils "
  "agent-utils "
  "git rm "
  "chmod +x "
  "npm run "
  "git merge "
)

for prefix in "${ALLOWED_PREFIXES[@]}"; do
  if [[ "$COMMAND" == "$prefix"* ]]; then
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "Matched bash-allowlist prefix"
      }
    }'
    exit 0
  fi
done

# Allow cd within project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR not set}"
if [[ "$COMMAND" == "cd "* ]]; then
  TARGET="${COMMAND#cd }"
  # Resolve to absolute path
  RESOLVED=$(cd "$TARGET" 2>/dev/null && pwd)
  if [[ "$RESOLVED" == "$PROJECT_DIR"* ]]; then
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "cd within project directory"
      }
    }'
    exit 0
  fi
fi

# Allow rm/rm -rf within project directory
if [[ "$COMMAND" == "rm "* ]]; then
  # Extract all path arguments (skip flags like -rf, -r, -f)
  ALL_PATHS_SAFE=true
  for arg in $COMMAND; do
    [[ "$arg" == "rm" ]] && continue
    [[ "$arg" == -* ]] && continue
    # Strip surrounding quotes (jq -r preserves literal quotes from command text)
    arg="${arg#\"}" ; arg="${arg%\"}"
    arg="${arg#\'}" ; arg="${arg%\'}"
    # Resolve to absolute path
    RESOLVED=$(realpath "$arg" 2>/dev/null)
    if [[ -z "$RESOLVED" || "$RESOLVED" != "$PROJECT_DIR"* || "$RESOLVED" == "$PROJECT_DIR" ]]; then
      ALL_PATHS_SAFE=false
      break
    fi
  done
  if [[ "$ALL_PATHS_SAFE" == "true" ]]; then
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "rm within project directory"
      }
    }'
    exit 0
  fi
fi

# No match — fall through to default permission handling
exit 0
