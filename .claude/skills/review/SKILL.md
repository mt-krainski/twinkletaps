---
name: review
description: "Request a code review on completed work. Use after completing features, before merging, or when stuck and wanting a fresh perspective."
---

# Requesting Code Review

Use a Task sub-agent to review code changes and catch issues before they cascade.

**Core principle:** Review early, review often.

## When to Request Review

**Mandatory:**
- After completing major feature or plan batch
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Spawn a code review sub-agent:**

Use the Task tool to spawn a general-purpose sub-agent. Provide the review template from `.claude/docs/code-reviewer-template.md` with context:

- `{WHAT_WAS_IMPLEMENTED}` — what you just built
- `{PLAN_OR_REQUIREMENTS}` — what it should do
- `{BASE_SHA}` — starting commit
- `{HEAD_SHA}` — ending commit
- `{DESCRIPTION}` — brief summary

**3. Act on feedback:**
- Fix Critical issues immediately
- Fix Important issues before proceeding
- Note Minor issues for later
- Push back if reviewer is wrong (with reasoning)

## Integration with Workflows

**Executing plans:** Review after each batch (e.g. 3 tasks); get feedback, apply, continue.
**Ad-hoc development:** Review before merge or when stuck.

## Red Flags

**Never:**
- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues

**If reviewer wrong:** Push back with technical reasoning; show code/tests; request clarification.
