#!/bin/bash
# PreToolUse hook: approve Bash commands that glob-based permissions can't match.
# Handles multiline args, paths with glob metacharacters (parentheses, brackets), etc.

COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

# Patterns to allow (prefix matches via == "prefix"*)
ALLOWED_PREFIXES=(
  "git add "
  "jira-utils "
  "agent-utils "
  "git rm "
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

# No match — fall through to default permission handling
exit 0
