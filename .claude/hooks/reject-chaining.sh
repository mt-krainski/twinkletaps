#!/bin/bash
# PreToolUse hook: reject Bash commands containing shell chaining operators.
# CLAUDE.md prohibits: &&, ||, ;, |, $(), backticks in shell commands.
# This hook catches violations before execution with a clear error message.
#
# Single-quoted content is stripped before checking, so operators inside
# commit messages or string literals don't trigger false positives.

COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

# Strip content inside single quotes to avoid false positives on string literals.
# Collapse newlines first so multi-line quoted strings are handled correctly.
STRIPPED=$(echo "$COMMAND" | tr '\n' ' ' | sed "s/'[^']*'//g")

# Check for chaining operators in the stripped command
FOUND=""
[[ "$STRIPPED" == *"&&"* ]] && FOUND="&&"
[[ "$STRIPPED" == *"||"* ]] && FOUND="${FOUND:+$FOUND, }||"
[[ "$STRIPPED" == *"|"* ]] && FOUND="${FOUND:+$FOUND, }|"
[[ "$STRIPPED" == *'$('* ]] && FOUND="${FOUND:+$FOUND, }\$()"
[[ "$STRIPPED" == *'`'* ]] && FOUND="${FOUND:+$FOUND, }\`\`"

if [[ -n "$FOUND" ]]; then
  jq -n --arg ops "$FOUND" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: ("Shell chaining operator(s) detected: " + $ops + ". Split into separate Bash calls instead. See CLAUDE.md shell commands rule.")
    }
  }'
fi

exit 0
