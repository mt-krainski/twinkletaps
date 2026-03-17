---
name: workflow
description: "Development workflow reference — Jira statuses, naming conventions, workflow types (planning vs implementation), review procedures, and task lifecycle. Use whenever you need to interact with Jira tasks, transition issue statuses, create branches or PRs, understand the development process, or determine what to do with a task in any column (Planning, Plan Review, To Do, In Progress, Review). This is the single source of truth for how work moves through the system."
---

# Development Workflow: Jira + Small Reviewable Increments

This skill defines how you (the agent) move work through the development lifecycle. All work is tracked in Jira project `GFD`. Every code change links back to a Jira issue key.

## Principles

- Optimize for **small, reviewable, testable increments**: ~200-300 LOC per task (guideline, not hard cap).
- **The app must build and run successfully after every task.** A task that leaves the app broken is not a valid increment.
- Follow the lifecycle: **Plan → Build → Review → Merge**.

## Jira Configuration

**Project:** `GFD` — https://gravitalforge.atlassian.net
**CLI:** `jira-utils` (see `/jira` skill for full command reference)

Issue statuses and transition IDs:

| Status      | Transition ID | Meaning                               |
|-------------|---------------|---------------------------------------|
| Planning    | `3`           | Needs implementation planning         |
| Plan Review | `4`           | Plan awaiting human review            |
| To Do       | `11`          | Approved and ready to implement       |
| In Progress | `21`          | Currently being implemented           |
| Review      | `2`           | PR open, awaiting code review         |
| Done        | `31`          | Merged to mainline                    |
| Invalid     | `32`          | Cancelled or not applicable           |

Use `jira-utils transition-issue` to move between statuses. Use `jira-utils get-issue` / `jira-utils search` to read issues. Use `jira-utils create-issue` to create. Use `jira-utils update-issue` to update. Use `jira-utils add-comment` for branch/PR/status updates. See `/jira` skill for full syntax.

**Board placement:** Newly created issues land in the backlog. You MUST follow up with `jira-utils move-to-board --board-id 1` to place them on the board.

**Issue types:** `Epic` (feature grouping), `Task` (implementation task linked to Epic via `parent` field).

### Issue Link Direction

See the `/jira` skill for issue link direction (`--inward` = blocker, `--outward` = blocked).

## Naming Conventions

- **Branch:** `task/GFD-###/<slug>`
- **Commit:** `GFD-###: <short message>`
- **PR title:** `[GFD-###] <Title>`

## User-Specific Configuration

Workflow parameters are in `.workflow` at repo root (`key=value` format). **Read this file before any step requiring user-specific values.**

| Key                | Usage                                                    |
|--------------------|----------------------------------------------------------|
| `humanAtlassianId` | Jira username of the human — used when assigning tasks   |

**Assignee format:** Plain string username, not email. Example: `fields: {"assignee": "matt"}`.

**Identity:** `humanAtlassianId` = the human developer. The `jira-utils` CLI credentials (in `.env`) belong to the AI agent (bot).

## Workflow Types

There are two distinct workflow types, distinguished by their Jira status columns.

### Planning Workflow

For tasks that require analysis and planning before implementation.

**Simple task (single implementation task):**
```
Planning → Plan Review (human approves) → To Do
```

**Complex task (epic with multiple tasks):**
```
Planning → Plan Review (human approves) → [create epic + tasks] → Done
```

1. Task starts in **Planning**, assigned to you.
2. Use the `/plan` skill to analyze the codebase and produce a plan. Write the plan to the task description, transition to **Plan Review** (ID `4`), assign to human.
3. Human reviews and leaves a comment (approval or change requests), then reassigns to you.
4. You pick it up in **Plan Review**, read comments:
   - **Approval (simple task)** → transition the planning task to **To Do** (ID `11`) so it enters the implementation workflow.
   - **Approval (complex task)** → create implementation Epic + Tasks (via `/plan` skill's post-approval flow) → transition the planning task to **Done** (ID `31`).
   - **Change requests** → update the plan, reassign back to human, keep in **Plan Review**.
   - **No comment from human** → reassign back to human asking for explicit feedback. Silence does NOT mean approval.

### Implementation Workflow

For tasks that are ready to implement (in **To Do** column).

```
To Do → In Progress → Review → Done
```

1. Pick up the task from **To Do**, transition to **In Progress**.
2. Create a feature branch (`task/GFD-###/<slug>`), implement the task following repo conventions.
3. Run lint and tests. If green, hand off to `/wrap` for commit, PR creation, and transition to **Review**.
4. Human reviews the PR and either approves or requests changes.

### Review & Merge

The **Review** column is exclusively for implementation code reviews (PRs). Plan reviews use the separate **Plan Review** column.

When assigned a task in `Review` status:
1. **Sync with base branch first:** checkout the PR's base branch (usually `main`), pull it, then checkout the development branch and merge the base branch in. Resolve any conflicts before proceeding.
2. Fetch Jira issue comments via `jira-utils get-issue`.
3. Fetch PR comments via `agent-utils gh-pr-fetch`.
4. Determine intent:
   - Clear review comments → address them using `/address-pr`, re-run lint/tests, push.
   - No clear indication → assign to human via `jira-utils update-issue`, add comment asking for clarification.

**If changes required:** Leave in `Review`, add comment with required changes.
**If accepted:** Verify CI green, merge PR, transition to `Done`.

## Stage Details

### Analysis & Planning

0. Ask clarifying questions if ambiguous. Err on the side of asking.
1. Scan the repo: architecture, conventions, test setup, CI, code patterns.
2. Identify where changes should live, what to reuse, risks and unknowns.
3. Produce an implementation plan with tasks:
   - Each task is a coherent increment (~200-300 LOC).
   - Each task is testable/verifiable in isolation.
   - App must build and run after every task.
   - Split by vertical slices or preparatory refactors.

**Good splits:**
- "Add auth middleware + tests" (complete behavior + verification)
- "Add DB migration + read API endpoint + tests" (complete vertical slice)
- "Introduce shared utility + refactor call sites + tests" (coherent cleanup)

**Bad splits:**
- "Add half of endpoint logic" / "Add rest of endpoint logic"
- DB migration in one task, ORM update in another (app broken between them)
- Task N changes a contract, task N+1 updates consumers

**Output:** Present plan, wait for human approval. After approval, the `/plan` skill creates Jira Epic + Tasks (the planner agent itself does not interact with Jira).

### Ready (Human Gate)

- Human selects next task(s). Do not start multiple tasks unless instructed.
- When starting: user provides issue key. Transition to `In Progress`. If no key, query with `jira-utils search`.
- Focus on one work item at a time.

### Development

0. Transition issue to `In Progress` via `jira-utils transition-issue`.
1. **Before creating the branch:** checkout `main` and pull to get the latest state. Then create the branch from there: `task/<ISSUE_KEY>/<slug>`.
2. Implement strictly according to task scope.
3. If scope expands: stop and create follow-up task in Jira.
4. Update tests and docs for the increment.
5. Run standard checks locally.

**Definition of Done:**
- Acceptance criteria satisfied.
- Test plan implemented and runnable.
- No lint/type failures introduced.
- App builds and runs successfully.
- Branch name posted as Jira comment.

Then: run lint and tests. If green, invoke the `/wrap` skill. Do not transition to `Review` directly.

## Pull Request Format

- **Title:** `[GFD-###] <Title>`
- **Description:** Issue key, what changed, how to test, risks/rollback notes.
- Post PR URL as Jira comment after creation.

## Jira Issue Description Template

When creating Tasks:

```markdown
## Problem / Goal
[1-3 sentences]

### Non-Goals
[Out of scope items]

---

## Acceptance Criteria
- [Observable outcomes]

---

## Repo Context
- **Files:** [paths involved]
- **Patterns:** [patterns to follow]
- **Related:** [relevant prior code/modules]

---

## Implementation Plan (Small & Concrete)
[Steps with exact file paths. ~NNN LOC.]

---

## Test Plan
- [Unit/integration/e2e updates]
- [Exact commands]
- [Fixtures/mocks needed]

---

## Verification Notes
[Manual validation if applicable]

---

## Risk / Rollback
[What could break. Default: revert the commit.]
```

Branch name and PR URL are posted as **Jira comments**, not in the description.

## Operating Mode

1. Invoke `/plan` with a description of work → plan produced and presented.
2. Human approves the plan → simple task transitions to To Do, complex task creates Epic + Tasks in Jira.
3. Pick next issue, invoke `/execute` on that Jira issue → code + issue to `Review`.
4. Review the PR → merge + transition to `Done`.

## Default Assumptions

- Branch naming: `task/GFD-###/<slug>`
- Commit messages: `GFD-###: <short message>`
- PR title: `[GFD-###] <Title>`
- Test commands: use repo defaults; if missing, infer and document.

