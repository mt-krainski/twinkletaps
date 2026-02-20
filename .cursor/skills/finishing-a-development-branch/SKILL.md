---
name: finishing-a-development-branch
description: Use when user says "wrap", "wrap up", "wrap development", "wrap it up", or similar — runs review, applies fixes, lints, tests, and creates a commit + PR
---

# Wrap Development Branch

Automated pipeline to finish a development branch: review → fix → lint → test → commit & PR.

**Trigger:** User says "wrap", "wrap up", "wrap development", "wrap it up", or similar.

**Announce at start:** "Wrapping up — running review → fix → lint → test → commit & PR."

## Pipeline

### Step 1: Determine Context

```bash
CURRENT_BRANCH=$(git branch --show-current)
BASE_BRANCH=$(git log --oneline --decorate --all | grep -oP 'origin/\K[^ ,)]+' | head -1)
# fallback
BASE_BRANCH=${BASE_BRANCH:-main}

BASE_SHA=$(git merge-base HEAD origin/$BASE_BRANCH)
HEAD_SHA=$(git rev-parse HEAD)
```

Find the in-progress kanban task (if any) in `.kanban/30_in_progress/`. Read it for context on what was implemented and what the requirements are.

### Step 2: Code Review

Dispatch the **code-reviewer** subagent using the template at `requesting-code-review/code-reviewer.md`.

Fill placeholders from the kanban task and git range:

- `{WHAT_WAS_IMPLEMENTED}` — from task title/description
- `{PLAN_OR_REQUIREMENTS}` — from task acceptance criteria / plan reference
- `{BASE_SHA}` / `{HEAD_SHA}` — from Step 1
- `{DESCRIPTION}` — brief summary of changes

**Wait for the review result.**

### Step 3: Apply Review Fixes

Act on the review feedback:

| Severity  | Action                                          |
| --------- | ----------------------------------------------- |
| Critical  | Fix immediately. If unclear, ask.               |
| Important | Fix before proceeding.                          |
| Minor     | Fix if quick (<2 min). Otherwise note and skip. |

If there are no Critical or Important issues, skip to Step 4.

After applying fixes, **stage and commit** the fixes (don't create a PR yet — just a fixup commit so the changes are captured).

### Step 4: Lint

```bash
npm run lint
```

If lint errors were introduced by our changes, fix them. Pre-existing lint issues unrelated to our work can be ignored.

### Step 5: Test

```bash
npm run test
npm run test:e2e
```

**If tests fail on our changes:** Fix and re-run. Do not proceed until green.

**If tests fail on unrelated issues:** Flag clearly in red, note the failures, but proceed.

### Step 6: Commit & PR

Follow the **commit-and-pr** skill (`/Users/mateusz/Projects/twinkletaps/.cursor/skills/commit-and-pr/SKILL.md`):

1. Stage relevant files (squash fixup commits if any from Step 3 into a clean history)
2. Create commit with repo git identity
3. Push branch
4. Open PR with `gh pr create`
5. Return the PR URL

### Step 7: Update Kanban

If a kanban task was found in Step 1:

1. Move the task file to `.kanban/50_merged/`
2. Update status to Merged, add PR link, brief summary

## Failure Modes

**Review finds critical architectural issues:**
Stop. Report to user. Don't force through.

**Tests fail and can't be fixed quickly:**
Stop. Report failing tests with output. Don't create PR with failing tests.

**No kanban task found:**
That's fine — skip kanban-related steps (1 context, 7 update). Derive PR description from git log instead.

## Red Flags

**Never:**

- Skip the review step
- Create a PR with failing tests
- Claim tests pass without running them (verification-before-completion)
- Force-push without explicit request

**Always:**

- Run lint and tests fresh before the PR
- Include evidence of passing tests in your output
- Stop and ask if review reveals fundamental issues
