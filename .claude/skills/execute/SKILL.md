---
name: execute
description: "Use when you have a Jira issue to implement. Handles the full cycle: load task, check blockers, create branch, implement with TDD, verify, and hand off to /wrap."
---

# Executing Plans

Execute Jira tasks one at a time. Each issue moves through: `To Do` -> `In Progress` -> `Review`.

**Jira:** Project `GFD` via `jira-utils` CLI (see `/jira` skill for full command reference).

**Core principle:** One task at a time. Transition the issue. Create the branch. Implement. Verify. Hand off to `/wrap`.

## The Process

### Step 1: Load and Review Task

1. Read the Jira issue (`jira-utils get-issue`) for the task. Use $ARGUMENTS as the issue key if provided.
2. **Check blockers:** Inspect `issuelinks` for "is blocked by" links. For each blocker, check status via `jira-utils get-issue`.
   - If any blocker is not `Done`: **stop**. Read `humanAtlassianId` from `.workflow`, assign to human via `jira-utils update-issue`, add comment naming blockers. Do not proceed unless user explicitly overrides.
   - If all blockers are `Done` (or none): continue.
3. Review critically — identify questions or concerns
4. If concerns: raise with user before starting

### Step 2: Start the Task

1. Transition to `In Progress`: `jira-utils transition-issue --issue-key <KEY> --transition-id 21`
2. Create branch: `task/<ISSUE_KEY>/<slug>`

### Step 3: Implement

Follow the issue's Implementation Plan:
1. Implement strictly according to task scope
2. **TDD is mandatory.** For each behavior:
   a. Write the failing test
   b. **HARD GATE — Run the test now.** If it does not FAIL, you have not written a meaningful test. Fix the test so it fails for the right reason before proceeding to production code.
   c. Write minimal production code to make the test pass
   d. Run the test again — confirm GREEN
3. Keep changes within ~200-300 LOC; if scope expands, stop and create follow-up issue
4. Commit frequently using naming conventions from `/workflow`.

See `/tdd` for the full red-green-refactor procedure.

### Step 3b: Quality Check

Before proceeding to verification, read `.claude/docs/quality-checklist.md` and confirm your implementation complies with all rules. Fix any violations now.

### Step 4: Verify

**No completion claims without fresh evidence.** (See `/verify`)

1. Run `npm run test`
2. Run `npm run lint`
3. Run `npm run test:e2e`
4. Verify the app builds and runs
5. Check acceptance criteria against actual results
6. Post branch name as Jira comment via `jira-utils add-comment`

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
- Follow naming conventions from the `/workflow` skill
