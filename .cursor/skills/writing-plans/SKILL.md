---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Break a design or spec into kanban task files, each a coherent, reviewable, testable increment. Tasks are created in `.kanban/20_ready/` following the project's kanban workflow (see `.cursor/rules/workflow.mdc`).

Assume the engineer executing each task has zero context for our codebase and questionable taste. Document everything they need: which files to touch, code, testing, docs to check, how to verify. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create kanban task files."

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

Check `.kanban/` for the highest existing T-### ID across all columns and increment from there. Task IDs are immutable.

## Kanban Task File Template

Each task file MUST be saved to `.kanban/20_ready/T-###__short_slug.md` and include ALL of these sections:

````markdown
# T-###: [Title]

**Task ID:** T-###
**Title:** [Title]
**Owner:** Agent
**Status:** Ready
**Created:** [YYYY-MM-DD]
**Updated:** [YYYY-MM-DD]

---

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

- **Epic:** [Reference to parent plan in `.kanban/10_analysis_plan/`]
- **Branch:** `task/T-###/short-slug`
- **PR:** (placeholder)
- **Depends on:** [Task IDs]
- **Related:** [Issue IDs, optional]
````

## Commit Format

All commits during task execution use: `T-###: <short message>`

## Implementation Details in Tasks

Each task's Implementation Plan should include:
- Exact file paths for every file to create or modify
- Code snippets showing the key implementation (not "add validation" — show the actual code)
- Exact test commands with expected output
- TDD steps: write failing test → verify fail → implement → verify pass

## Execution Handoff

After creating all task files, present:

**"Tasks created in `.kanban/20_ready/`. Which task should I start?"**

The user picks a task. Execution follows the kanban workflow:
1. Move task to `.kanban/30_in_progress/`
2. Create branch `task/T-###/short-slug`
3. Implement following the task's plan
4. Run tests and lint
5. Move task to `.kanban/40_review/`

## Remember
- Exact file paths always
- Complete code in task plans (not "add validation")
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits
- ~200-300 LOC per task — each task leaves the app in a working state
- Task IDs are sequential and immutable
- All tasks reference their parent epic in `.kanban/10_analysis_plan/`
