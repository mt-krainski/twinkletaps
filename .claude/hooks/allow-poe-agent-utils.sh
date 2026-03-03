#!/bin/bash
# PreToolUse hook: auto-approve agent-utils CLI commands.
# Glob patterns in permissions.allow don't match multiline args (e.g. commit
# messages with newlines), so we handle agent-utils commands here instead.

COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

if [[ "$COMMAND" == "agent-utils "* || "$COMMAND" == "poe -C agent-utils "* ]]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "Auto-approved agent-utils command"
    }
  }'
else
  exit 0
fi
