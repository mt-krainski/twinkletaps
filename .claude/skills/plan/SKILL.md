---
name: plan
description: "Planning specialist for breaking specs into Jira tasks. Use when asked to analyze a feature, break down requirements, or create implementation tasks. Do NOT write or modify application code — only create Jira issues."
---

# Writing Plans

## Constraints

- **Do NOT write or modify application code.** You only create and update Jira issues.
- **Do NOT start implementing.** Your output is a plan, not code.
- Ask clarifying questions when ambiguous. Err on the side of asking.

## Task Sizing — The Hard Constraint

Each task MUST be:
- **~200-300 lines changed** (guideline, not hard cap — justify exceeding it)
- **A coherent increment** — not half a feature. App must build and run after each task.
- **Independently testable/verifiable**
- **Vertical slices preferred** — thin end-to-end capability over horizontal layers

**Bad splits (NEVER):**
- Task N changes a contract (schema, API, types) and task N+1 updates consumers
- "Add UI skeleton" with nothing runnable
- DB migration in one task, ORM update in another

**Good splits:**
- "Add auth middleware + tests" (complete behavior + verification)
- "Add DB migration + read API endpoint + tests" (complete vertical slice)
- "Introduce shared utility + refactor call sites + tests" (coherent cleanup)

## Planning Process

### 1. Requirements Analysis
- Understand the request completely
- Identify success criteria, assumptions, constraints
- List explicit non-goals

### 2. Codebase Exploration
- Scan repo: architecture, conventions, test setup, existing patterns
- Identify where changes should live and what can be reused
- Note risks and unknowns

### 3. Task Decomposition
Break work into small, reviewable tasks. Split by vertical slices or preparatory refactors.

### 4. Implementation Order
- Prioritize by dependencies
- Group related changes
- Enable incremental testing
- Each task should be mergeable independently

## Plan Format

Present the plan before creating any Jira issues:

```markdown
## Plan

### Overview
[2-3 sentence summary]

### Architecture Changes
- [Change 1: file path and description]

### Tasks

#### [Task Title] (~NNN LOC)
- **Goal:** What this task delivers
- **Files:** paths involved
- **Depends on:** None / GFD-###
- **Risk:** Low/Medium/High
- **Verification:** How to confirm it works

### Testing Strategy
- Unit tests: `npm run test` — [coverage]
- E2E tests: `npm run test:e2e` — [coverage]
- Lint: `npm run lint`

### Risks & Mitigations
- **Risk**: [Description] → Mitigation: [How]

### Success Criteria
- [ ] Criterion 1
```

## Creating Jira Issues

After human approves:

1. Create Epic (`jira_create_issue`, `issue_type: "Epic"`) if none exists.
2. For each task, create Task with:
   - `project_key: "GFD"`
   - `summary`: task title
   - `description`: full description following the template in `.claude/rules/workflow.md`
   - `additional_fields: {"parent": "GFD-###"}` to link to Epic

3. After all issues created, wire blocking relationships with `jira_create_issue_link`:
   ```
   jira_create_issue_link(link_type="Blocks", inward_issue_key="B", outward_issue_key="A")
   ```
   `inward_issue_key` = blocked issue; `outward_issue_key` = blocker.

## Task Description Content

Each task's Implementation Plan should include:
- Exact file paths for every file to create or modify
- Code snippets showing key implementation
- Exact test commands with expected output
- TDD steps: write failing test -> verify fail -> implement -> verify pass

## Sizing and Phasing

For large features:
- **Phase 1:** Minimum viable — smallest slice that provides value
- **Phase 2:** Core experience — complete happy path
- **Phase 3:** Edge cases — error handling, polish
- **Phase 4:** Optimization — performance, monitoring

Each phase should be mergeable independently.

## After Creating Issues

Present: **"Issues created in Jira. Which task should I start?"**

User picks a task. Execution follows the `/execute` skill.
