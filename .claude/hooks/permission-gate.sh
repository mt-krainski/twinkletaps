#!/bin/bash
# PreToolUse hook: deny-by-default for all tool calls.
# Replicates dontAsk behavior while using acceptEdits mode, which works around
# Claude Code bug #21242 (Edit/Write denied for .claude/ directory in dontAsk mode).
#
# This hook is the single source of truth for what tools and commands are allowed.
# It absorbs the logic previously in bash-allowlist.sh and the Bash patterns
# from settings.json permissions.allow.

set -f  # Disable glob expansion — paths may contain [], (), etc.

INPUT=$(cat /dev/stdin)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')

case "$TOOL_NAME" in
  # --- Auto-allowed tools (safe in acceptEdits mode) ---
  Read|Glob|Grep|Edit|Write)
    # File operations — auto-allowed by acceptEdits mode.
    # Write/Edit are additionally gated by restrict-write-to-project.sh
    exit 0
    ;;

  # --- Internal Claude Code tools ---
  Agent|Skill|TaskCreate|TaskUpdate|TaskGet|TaskList|TaskOutput|TaskStop|EnterPlanMode|ExitPlanMode|EnterWorktree|ExitWorktree|NotebookEdit|ToolSearch|CronCreate|CronDelete|CronList|AskUserQuestion)
    exit 0
    ;;

  # --- Explicitly allowed tools ---
  WebSearch)
    exit 0
    ;;

  # --- MCP tools ---
  mcp__*)
    exit 0
    ;;

  # --- WebFetch: domain-restricted ---
  WebFetch)
    URL=$(echo "$INPUT" | jq -r '.tool_input.url // empty')
    if [[ "$URL" == *"docs.hivemq.com"* || "$URL" == *"github.com"* ]]; then
      exit 0
    fi
    # Allow in interactive sessions (user can see and approve the fetch).
    # For ticket-loop, WebFetch to unknown domains is unusual and should be blocked.
    # Deny by default — update this list to add more allowed domains.
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "WebFetch domain not in allowlist. Allowed: docs.hivemq.com"
      }
    }'
    exit 0
    ;;

  # --- Bash: command allowlist ---
  Bash)
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

    # --- Deny list (checked first) ---
    if [[ "$COMMAND" == "sudo "* ]]; then
      jq -n '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "sudo is not allowed"
        }
      }'
      exit 0
    fi
    if [[ "$COMMAND" == "npm run supr:"* ]]; then
      jq -n '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: "npm run supr: is not allowed"
        }
      }'
      exit 0
    fi

    # --- Allow list: prefix matches ---
    # Git commands
    ALLOWED_PREFIXES=(
      "git status"
      "git diff"
      "git add "
      "git checkout "
      "git fetch "
      "git pull"
      "git branch"
      "git merge-base "
      "git rev-parse HEAD"
      "git log"
      "git cherry-pick "
      "git reset "
      "git stash"
      "git merge origin/main"
      "git rm "
      # NPM commands
      "npm run "
      "npm install"
      "npm uninstall "
      "npm view "
      # Tool commands
      "agent-utils "
      "agent-utils/scripts/"
      "jira-utils "
      "uv run "
      "uv add "
      # Java/Gradle
      "./gradlew "
      "gradle"
      "java"
      # File commands
      "mkdir "
      "ls"
      "chmod +x "
      "wc "
    )

    for prefix in "${ALLOWED_PREFIXES[@]}"; do
      if [[ "$COMMAND" == "$prefix"* ]]; then
        exit 0
      fi
    done

    # --- cd: allow within project directory ---
    if [[ "$COMMAND" == "cd "* ]]; then
      PROJECT_DIR="${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR not set}"
      TARGET="${COMMAND#cd }"
      # Strip surrounding quotes
      TARGET="${TARGET#\"}" ; TARGET="${TARGET%\"}"
      TARGET="${TARGET#\'}" ; TARGET="${TARGET%\'}"
      RESOLVED=$(cd "$TARGET" 2>/dev/null && pwd)
      if [[ "$RESOLVED" == "$PROJECT_DIR"* ]]; then
        exit 0
      fi
    fi

    # --- rm: allow within project directory ---
    if [[ "$COMMAND" == "rm "* ]]; then
      PROJECT_DIR="${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR not set}"
      ALL_PATHS_SAFE=true
      for arg in $COMMAND; do
        [[ "$arg" == "rm" ]] && continue
        [[ "$arg" == -* ]] && continue
        arg="${arg#\"}" ; arg="${arg%\"}"
        arg="${arg#\'}" ; arg="${arg%\'}"
        RESOLVED=$(realpath "$arg" 2>/dev/null)
        if [[ -z "$RESOLVED" || "$RESOLVED" != "$PROJECT_DIR"* || "$RESOLVED" == "$PROJECT_DIR" ]]; then
          ALL_PATHS_SAFE=false
          break
        fi
      done
      if [[ "$ALL_PATHS_SAFE" == "true" ]]; then
        exit 0
      fi
    fi

    # --- Not in any allow list — deny ---
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Bash command not in allowlist"
      }
    }'
    exit 0
    ;;

  # --- Unknown tool — deny ---
  *)
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Tool not in allowlist"
      }
    }'
    exit 0
    ;;
esac
