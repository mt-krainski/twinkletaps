# Agentic Development Workflow: Jira + Small Reviewable Increments

## Goals

- Mimic a normal SDLC: **Plan -> Build -> Review -> Merge**.
- Use **Jira** (project `GFD`) as the source of truth for tasks and status.
- Optimize for **small, reviewable, testable increments**: ~200-300 LOC per task (guideline, not hard cap).
- **Invariant: the app must build and run successfully after every task.** A task that leaves the app broken is not a valid increment.
- Every change links back to a Jira issue key.

## Jira Configuration

**Project:** `GFD` — https://gravitalforge.atlassian.net
**MCP server:** `gravitalforge-atlassian`

Issue statuses and transition IDs:

| Status      | Transition ID | Meaning                               |
|-------------|---------------|---------------------------------------|
| Planning    | —             | Needs implementation planning         |
| To Do       | `11`          | Approved and ready to implement       |
| In Progress | `21`          | Currently being implemented           |
| Review      | `2`           | PR open, awaiting review              |
| Done        | `31`          | Merged to mainline                    |
| Invalid     | —             | Cancelled or not applicable           |

Use `jira_transition_issue` to move between statuses. Use `jira_get_issue` / `jira_search` to read issues. Use `jira_create_issue` to create. Use `jira_update_issue` to update. Use `jira_add_comment` for branch/PR/status updates.

**Board placement:** Issues created via `jira_create_issue` are automatically placed on the board.

**Issue types:** `Epic` (feature grouping), `Task` (implementation task linked to Epic via `parent` field).

### Issue Link Direction

For the `"Blocks"` link type, the parameter names are counter-intuitive:

- `inward_issue_key` = the issue that **does the blocking** (the upstream blocker)
- `outward_issue_key` = the issue that **is blocked** (the downstream task)

> "Task A blocks Task B" → `jira_create_issue_link(link_type="Blocks", inward_issue_key=<Task A key>, outward_issue_key=<Task B key>)`

In plain terms: if Task A must finish before Task B can start, Task A is the blocker (`inward`) and Task B is the blocked issue (`outward`).

## Naming Conventions

- **Branch:** `task/GFD-###/<slug>`
- **Commit:** `GFD-###: <short message>`
- **PR title:** `[GFD-###] <Title>`

## User-Specific Configuration

Workflow parameters are in `.cursor.workflow` at repo root (`key=value` format). **Read this file before any step requiring user-specific values.**

| Key                | Usage                                                    |
|--------------------|----------------------------------------------------------|
| `humanAtlassianId` | Jira username of the human — used when assigning tasks   |

**Assignee format:** Plain string username, not email. Example: `fields: {"assignee": "matt"}`.

**Identity:** `humanAtlassianId` = the human developer. The MCP credentials belong to the AI agent (bot).

## Stage Responsibilities

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

**Output:** Present plan, wait for human approval. After approval, create Jira Epic + Tasks.

### Ready (Human Gate)

- Human selects next task(s). Agent does not start multiple tasks unless instructed.
- When starting: user provides issue key. Transition to `In Progress`. If no key, query with `jira_search`.
- Focus on one work item at a time.

### Development

0. Transition issue to `In Progress` via `jira_transition_issue`.
1. Create branch: `task/<ISSUE_KEY>/<slug>`.
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

### Review & Merge

When assigned a task in `Review` status:
1. Fetch Jira issue comments via `jira_get_issue`.
2. Fetch PR comments via `gh api`.
3. Determine intent:
   - Clear review comments -> address them using `/address-pr`, re-run lint/tests, push.
   - No clear indication -> assign to human via `jira_update_issue`, add comment asking for clarification.

**If changes required:** Leave in `Review`, add comment with required changes.
**If accepted:** Verify CI green, merge PR, transition to `Done`.

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

1. Invoke `/plan` with a description of work -> Epic + Tasks created in Jira.
2. Pick next issue, invoke `/execute` on that Jira issue -> code + issue to `Review`.
3. Review the PR -> merge + transition to `Done`.

## Default Assumptions

- Branch naming: `task/GFD-###/<slug>`
- Commit messages: `GFD-###: <short message>`
- PR title: `[GFD-###] <Title>`
- Test commands: use repo defaults; if missing, infer and document.

## Prefer Package Scripts

Before running **any** command during development, check `package.json` `scripts` for an equivalent. Use `npm run <script>` — never invoke the underlying binary directly.

| Forbidden | Allowed |
|-----------|---------|
| `npx prisma migrate dev` | `npm run migrate` |
| `yarn dlx pkg` | `npm run tool` |
| `./node_modules/.bin/tsc` | `npm run build` |
| `npx jest` | `npm run test` |
| `npx playwright test` | `npm run test:e2e` |

Only fall back to a direct command if no equivalent script exists — and document why.
