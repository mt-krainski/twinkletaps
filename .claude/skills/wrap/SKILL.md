---
name: wrap
description: "Finish a development branch: code review -> fix issues -> lint -> test -> commit & PR -> update Jira. Use when user says 'wrap', 'wrap up', 'finish', or after completing implementation in /execute."
---

# Wrap Development Branch

Automated pipeline: review -> fix -> lint -> test -> commit & PR.

**Announce at start:** "Wrapping up — running review -> fix -> lint -> test -> commit & PR."

## Pipeline

### Step 1: Determine Context

```bash
CURRENT_BRANCH=$(git branch --show-current)
BASE_BRANCH=$(git log --oneline --decorate --all | grep -oP 'origin/\K[^ ,)]+' | head -1)
BASE_BRANCH=${BASE_BRANCH:-main}
BASE_SHA=$(git merge-base HEAD origin/$BASE_BRANCH)
HEAD_SHA=$(git rev-parse HEAD)
```

Infer Jira issue key from branch name (e.g. `task/GFD-42/slug` -> `GFD-42`). If found, read the issue with `jira_get_issue` for context.

### Step 2: Code Review

Use the Task tool to spawn a code review sub-agent. Provide the review template from `.claude/docs/code-reviewer-template.md` with:

- `{WHAT_WAS_IMPLEMENTED}` — from issue title/description
- `{PLAN_OR_REQUIREMENTS}` — from issue acceptance criteria
- `{BASE_SHA}` / `{HEAD_SHA}` — from Step 1
- `{DESCRIPTION}` — brief summary of changes

Wait for the review result.

### Step 3: Apply Review Fixes

| Severity  | Action                                          |
|-----------|------------------------------------------------|
| Critical  | Fix immediately. If unclear, ask.              |
| Important | Fix before proceeding.                         |
| Minor     | Fix if quick (<2 min). Otherwise note and skip.|

If no Critical or Important issues, skip to Step 4.

After fixes, stage and commit (fixup commit, not a PR yet).

### Step 4: Lint

```bash
npm run lint
```

Fix lint errors introduced by our changes. Pre-existing unrelated issues can be ignored.

### Step 5: Test

**No completion claims without fresh evidence.**

```bash
npm run test
npm run test:e2e
```

**If tests fail on our changes:** Fix and re-run. Do not proceed until green.
**If tests fail on unrelated issues:** Flag clearly, note failures, but proceed.

Every claim in Step 6's PR description must be backed by command output.

### Step 6: Commit & PR

Follow the `/commit` skill:

1. Stage relevant files (squash fixup commits if any)
2. Create commit with repo git identity
3. Push branch
4. Open PR with `gh pr create`
5. Return the PR URL

### Step 7: Update Jira

If a Jira issue was found in Step 1:

1. Transition to `Review`: `jira_transition_issue` with `transition_id: "2"`
2. Read `humanAtlassianId` from `.cursor.workflow`, assign to human via `jira_update_issue` with `fields: {"assignee": "<humanAtlassianId>"}`
3. Add comment via `jira_add_comment`: summary of implementation + PR link + "Please review and merge, or leave feedback."

**Do NOT transition to `Done`.** Done only after PR is merged to mainline.

## Failure Modes

**Review finds critical architectural issues:** Stop. Report to user.
**Tests fail and can't be fixed quickly:** Stop. Report. Don't create PR with failing tests.
**No Jira issue found:** Skip Jira steps. Derive PR description from git log.

## Red Flags

**Never:**
- Skip the review step
- Create PR with failing tests
- Claim tests pass without running them
- Force-push without explicit request

**Always:**
- Run lint and tests fresh before PR
- Include evidence of passing tests
- Stop and ask if review reveals fundamental issues
