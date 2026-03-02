---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Break a design or spec into Jira Task issues, each a coherent, reviewable, testable increment. Tasks are created in project `GFD` with status `To Do` via the `user-gravitalforge-atlassian` MCP server.

Assume the engineer executing each task has zero context for our codebase and questionable taste. Document everything they need: which files to touch, code, testing, docs to check, how to verify. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create Jira issues."

## Task Sizing — The Hard Constraint

Each task MUST be:
- **~200-300 lines changed** (guideline, not a hard cap — but justify exceeding it)
- **A coherent increment** — not half a feature. The app must build and run after each task.
- **Independently testable/verifiable** — each task has its own test plan and acceptance criteria
- **Vertical slices preferred** — thin end-to-end capability over horizontal layers

**Bad splits (NEVER do these):**
- Task N changes a contract (schema, API, types) and task N+1 updates consumers
- "Add UI skeleton" with nothing runnable or testable
- "Add half of endpoint logic" then "add rest of endpoint logic"
- DB migration in one task, ORM update in another — app is broken between them

**Good splits:**
- "Add auth middleware + tests" (complete behavior + verification)
- "Add DB migration + read API endpoint + tests" (complete path)
- "Introduce shared utility + refactor two call sites + tests" (coherent cleanup)

## Task ID Assignment

Issue keys are auto-assigned by Jira when you call `jira_create_issue`. Do not pre-assign IDs.

## Creating Jira Issues

If no Epic exists for this feature area, create one first:
```
jira_create_issue: project_key="GFD", issue_type="Epic", summary="<feature name>"
```
Then use its returned key as the parent for all Stories.

For each task, call `jira_create_issue`:

```
project_key: "GFD"
summary: "<task title>"
issue_type: "Task"
description: <full description following the template below>
additional_fields: {"parent": "GFD-###"}  // Epic key from above
```

**Jira description workaround:** Never use literal angle brackets (`<...>`) in Jira descriptions — the MCP server's preprocessor misinterprets them as HTML tags and silently truncates everything after them ([upstream bug](https://github.com/sooperset/mcp-atlassian/issues/XXX)). Use square brackets instead: `[placeholder]`, `[script]`, `[your-value]`.

The description must follow this template:

````markdown
## Problem / Goal

[What user value this delivers. 1-3 sentences.]

### Non-Goals

[Explicitly state what is out of scope.]

---

## Acceptance Criteria

- [Observable outcome 1]
- [Observable outcome 2]
- [How to verify the feature works]

---

## Repo Context

- **Files:** [paths to files/components involved]
- **Patterns:** [existing patterns to follow]
- **Related:** [relevant prior code/modules]

---

## Implementation Plan

[Steps with expected code touchpoints. Include exact file paths.]

**Estimated size:** ~NNN LOC.

---

## Test Plan

- [Unit/integration/e2e updates required]
- [Exact commands to run]
- [Fixtures/mocks needed]

---

## Verification Notes

[Manual validation steps if applicable.]

---

## Risk / Rollback

[What could break. Default: revert the commit.]

---

## Metadata

- **Epic:** [GFD-### — Epic title]
- **Branch:** `task/GFD-###/short-slug`  ← fill in after Jira assigns the key
- **PR:** (placeholder)
- **Depends on:** [GFD-### if applicable]
````

Issues created via `jira_create_issue` are automatically placed on the board — no manual step required.

After **all** issues are created, create blocking links for each dependency using `jira_create_issue_link`:

```
link_type: "Blocks"
inward_issue_key: <the blocked issue>   // shows as "is blocked by" on this issue
outward_issue_key: <the blocker issue>  // shows as "blocks" on that issue
```

Example — if GFD-22 depends on GFD-21 (GFD-21 must be done first):
```
jira_create_issue_link(link_type="Blocks", inward_issue_key="GFD-22", outward_issue_key="GFD-21")
```

Create one link per dependency pair. Do not skip this step — these links are what the executor uses to enforce the implementation order.

## Commit Format

All commits during task execution use: `GFD-###: <short message>`

## Implementation Details in Tasks

Each task's Implementation Plan should include:
- Exact file paths for every file to create or modify
- Code snippets showing the key implementation (not "add validation" — show the actual code)
- Exact test commands with expected output
- TDD steps: write failing test → verify fail → implement → verify pass

## Execution Handoff

After creating all issues, present:

**"Issues created in Jira. Which task should I start?"**

The user picks a task. Execution follows the workflow:
1. Transition issue to `In Progress` (transition ID `21`)
2. Create branch `task/GFD-###/short-slug`
3. Implement following the task's plan
4. Run tests and lint
5. Transition issue to `Review` (transition ID `2`)

## Remember
- Exact file paths always
- Complete code in task plans (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- ~200-300 LOC per task — each task leaves the app in a working state
- Issue IDs are assigned by Jira — don't pre-assign
- All tasks reference their parent Epic
