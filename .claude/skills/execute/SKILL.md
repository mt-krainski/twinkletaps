---
name: execute
description: "Use when you have a Jira issue to implement. Handles the full cycle: load task, check blockers, create branch, implement with TDD, verify, and hand off to /wrap."
---

# Executing Plans

Execute Jira tasks one at a time. Each issue moves through: `To Do` -> `In Progress` -> `Review`.

**Jira:** Project `GFD` via MCP server `gravitalforge-atlassian`.

**Core principle:** One task at a time. Transition the issue. Create the branch. Implement. Verify. Hand off to `/wrap`.

## The Process

### Step 1: Load and Review Task

1. Read the Jira issue (`jira_get_issue`) for the task. Use $ARGUMENTS as the issue key if provided.
2. **Check blockers:** Inspect `issuelinks` for "is blocked by" links. For each blocker, check status via `jira_get_issue`.
   - If any blocker is not `Done`: **stop**. Read `humanAtlassianId` from `.cursor.workflow`, assign to human via `jira_update_issue`, add comment naming blockers. Do not proceed unless user explicitly overrides.
   - If all blockers are `Done` (or none): continue.
3. Review critically — identify questions or concerns
4. If concerns: raise with user before starting

### Step 2: Start the Task

1. Transition to `In Progress`: `jira_transition_issue` with `transition_id: "21"`
2. Create branch: `task/<ISSUE_KEY>/<slug>`

### Step 3: Implement

Follow the issue's Implementation Plan:
1. Implement strictly according to task scope
2. Use TDD: write failing test -> verify fail -> implement -> verify pass (see `/tdd`)
3. Keep changes within ~200-300 LOC; if scope expands, stop and create follow-up issue
4. Commit frequently: `<ISSUE_KEY>: <short message>`

### Step 4: Verify

**No completion claims without fresh evidence.** (See `/verify`)

1. Run `npm run test`
2. Run `npm run lint`
3. Run `npm run test:e2e`
4. Verify the app builds and runs
5. Check acceptance criteria against actual results
6. Post branch name as Jira comment via `jira_add_comment`

Every claim must be backed by command output from this step.

### Step 5: Wrap Up

If everything is green, invoke `/wrap` immediately.

## When to Stop

**STOP executing when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Task has critical gaps
- You don't understand an instruction
- Verification fails repeatedly
- Scope expanding beyond ~200-300 LOC target

**Ask for clarification rather than guessing.**

## Remember

- **One task at a time** — never parallel unless explicitly instructed
- Review task critically first
- Follow the task's plan steps exactly
- Don't skip verifications
- Stop when blocked, don't guess
- Never start implementation on main/master without explicit consent
- Commits: `<ISSUE_KEY>: <short message>`
- Branch: `task/<ISSUE_KEY>/<slug>`
