#!/bin/bash
# PreToolUse hook: reject Bash commands containing shell chaining operators.
# Catches the most common CLAUDE.md violations before execution.
#
# Checked: &&, ||, |, $(), backticks
# NOT checked (too many false positives):
#   ; — appears in jq filters, sed expressions, for-loops
#   > — appears in heredocs, comparisons, redirects like 2>&1
#
# Single-quoted content is stripped before checking, so operators inside
# commit messages (agent-utils git-commit -m '...') or string literals
# don't trigger false positives. Double-quoted content is NOT stripped,
# but this is acceptable since agent-utils (not raw git) is the required
# path for commits and pushes.

COMMAND=$(jq -r '.tool_input.command' < /dev/stdin)

# Strip content inside single quotes to avoid false positives on string literals.
# Collapse newlines first so multi-line quoted strings are handled correctly.
STRIPPED=$(printf '%s' "$COMMAND" | tr '\n' ' ' | sed "s/'[^']*'//g")

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
