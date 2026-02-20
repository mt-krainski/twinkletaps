---
name: executing-plans
description: Use when you have kanban task files in 20_ready to execute one at a time with review checkpoints
---

# Executing Plans

## Overview

Execute kanban tasks one at a time, following the project's kanban workflow (see `.cursor/rules/workflow.mdc`). Each task moves through the board: `20_ready` → `30_in_progress` → `40_review`.

**Core principle:** One task at a time. Move the file. Create the branch. Implement. Verify. Move to review.

**Announce at start:** "I'm using the executing-plans skill to implement this task."

## The Process

### Step 1: Load and Review Task

1. Read the task file from `.kanban/20_ready/` (or `.kanban/30_in_progress/` if resuming)
2. Review critically — identify any questions or concerns about the plan
3. If concerns: Raise them with the user before starting
4. If no concerns: Proceed to Step 2

### Step 2: Start the Task

1. Move the task file to `.kanban/30_in_progress/` (use `mv`, don't recreate)
2. Create a branch: `task/<TASK_ID>/<slug>`
3. Update the task file's Status field to "In Progress"

### Step 3: Implement

Follow the task's Implementation Plan:
1. Implement strictly according to the task scope
2. Use TDD: write failing test → verify fail → implement → verify pass
3. Keep changes within the targeted ~200-300 LOC; if scope expands, stop and create a follow-up task
4. Commit frequently using format: `<TASK_ID>: <short message>`

### Step 4: Verify

**Use the verification-before-completion skill** (`/Users/mateusz/Projects/twinkletaps/.cursor/skills/verification-before-completion/SKILL.md`). No completion claims without fresh evidence.

1. Run the project's test suite (`npm run test` or equivalent)
2. Run lint (`npm run lint` or equivalent)
3. Run e2e tests (`npm run test:e2e` or equivalent)
4. Verify the app builds and runs successfully
5. Check acceptance criteria against actual results
6. Update the task file metadata (Branch name, notes about what changed)

Every claim in Step 5 must be backed by command output from this step.

### Step 5: Move to Review

If everything is green:
1. Move task file to `.kanban/40_review/`
2. Update the task file's Status field to "Review"
3. Report what was implemented and verification results

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
- Commits use `<TASK_ID>: <short message>` format
- Branch naming: `task/<TASK_ID>/<slug>`

## Related

- **writing-plans** — Creates the kanban task files this skill executes
- **finishing-a-development-branch** — Use after task is complete and reviewed
