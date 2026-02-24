---
name: executing-plans
description: Use when you have a Jira issue in To Do to execute one at a time with review checkpoints
---

# Executing Plans

## Overview

Execute Jira tasks one at a time, following the project's workflow (see `.cursor/rules/workflow.mdc`). Each issue moves through: `To Do` → `In Progress` → `Review`.

**Jira:** Project `GFD` via MCP server `user-gravitalforge-atlassian`.

**Core principle:** One task at a time. Transition the issue. Create the branch. Implement. Verify. Hand off to **finishing-a-development-branch** to wrap up.

**Announce at start:** "I'm using the executing-plans skill to implement this task."

## The Process

### Step 1: Load and Review Task

1. Read the Jira issue (`jira_get_issue`) for the task being executed
2. **Check blockers:** Inspect the `issuelinks` field for any links where this issue "is blocked by" another. For each blocker, check its status via `jira_get_issue`.
   - If any blocker is not `Done`: **stop**. Read `humanAtlassianId` from `.cursor.workflow` and assign the issue to the human via `jira_update_issue` with `fields: {"assignee": "<humanAtlassianId>"}` (plain string username). Add a comment via `jira_add_comment` naming the blocking issues and asking the user to resolve them or explicitly approve proceeding anyway. Inform the user in chat as well. Do not proceed unless the user explicitly asks to override this check.
   - If all blockers are `Done` (or there are none): continue.
3. Review critically — identify any questions or concerns about the plan
4. If concerns: Raise them with the user before starting
5. If no concerns: Proceed to Step 2

### Step 2: Start the Task

1. Transition the issue to `In Progress`: `jira_transition_issue` with `transition_id: "21"`
2. Create a branch: `task/<ISSUE_KEY>/<slug>`

### Step 3: Implement

Follow the issue's Implementation Plan:
1. Implement strictly according to the task scope
2. Use TDD: write failing test → verify fail → implement → verify pass
3. Keep changes within the targeted ~200-300 LOC; if scope expands, stop and create a follow-up issue in Jira
4. Commit frequently using format: `<ISSUE_KEY>: <short message>`

### Step 4: Verify

**Use the verification-before-completion skill** (`/Users/mateusz/Projects/twinkletaps/.cursor/skills/verification-before-completion/SKILL.md`). No completion claims without fresh evidence.

1. Run the project's test suite (`npm run test` or equivalent)
2. Run lint (`npm run lint` or equivalent)
3. Run e2e tests (`npm run test:e2e` or equivalent)
4. Verify the app builds and runs successfully
5. Check acceptance criteria against actual results
6. Update the Jira issue description's Metadata section (branch name, notes) via `jira_update_issue`

Every claim in Step 5 must be backed by command output from this step.

### Step 5: Wrap Up

**Do NOT transition the issue to `Review` directly.** Moving to Review, creating the PR, assigning to the user, and adding the Jira comment are all owned by the **finishing-a-development-branch** skill.

If everything is green, invoke **finishing-a-development-branch** immediately — do not wait for the user to say "wrap".

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Task has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly
- Scope is expanding beyond the task's ~200-300 LOC target

**Ask for clarification rather than guessing.**

## When to Revisit

**Return to Step 1 when:**
- User updates the task based on feedback
- Fundamental approach needs rethinking

**Don't force through blockers** — stop and ask.

## Remember
- **One task at a time** — never work on multiple tasks in parallel unless explicitly instructed
- Review task critically first
- Follow the task's plan steps exactly
- Don't skip verifications
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent
- Commits use `<ISSUE_KEY>: <short message>` format
- Branch naming: `task/<ISSUE_KEY>/<slug>`

## Related

- **writing-plans** — Creates the Jira issues this skill executes
- **finishing-a-development-branch** — **Must be run after implementation is done.** Owns the Review transition, PR creation, user assignment, and Jira comment. Never transition to Review without it.
