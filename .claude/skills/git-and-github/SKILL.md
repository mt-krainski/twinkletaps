---
name: git-and-github
description: "Reference for all git and GitHub operations via agent-utils poe tasks. Use this to look up the correct command for committing, pushing, creating PRs, fetching PR feedback, or replying to PR comments."
---

# Git and GitHub via agent-utils

All git commit/push and GitHub PR operations must use the poe tasks in `agent-utils/` instead of raw `git`/`gh` commands. Run them from the repo root with `(cd agent-utils && poe <task>)`.

## Available Poe Tasks

### `git-commit` — Create a commit

Sets `GIT_AUTHOR_*` and `GIT_COMMITTER_*` from repo `git config` automatically. Fails if nothing is staged.

```bash
(cd agent-utils && poe git-commit -m "<message>")
```

**Message format:** `<ISSUE_KEY>: <short title>` with optional body (bullets). Example:

```
(cd agent-utils && poe git-commit -m "GFD-42: Add device service

- Replace team.ts with device.ts
- Update WorkspaceProvider to expose devices")
```

---

### `git-push` — Push current branch

Pushes with `-u origin <branch>`. Refuses `main`/`master` and branches that don't start with `task/`.

```bash
(cd agent-utils && poe git-push)
```

---

### `gh-pr-create` — Open a pull request

Reads `GITHUB_OWNER` and `GITHUB_REPO` from `agent-utils/.env`.

```bash
(cd agent-utils && poe gh-pr-create \
  --base <base-branch> \
  --title "[GFD-###] <Title>" \
  --body "<body>")
```

---

### `gh-pr-fetch` — Fetch all PR feedback

Returns combined JSON with `inline_comments`, `reviews`, and `conversation`.

```bash
(cd agent-utils && poe gh-pr-fetch <pr-number>)
```

---

### `gh-pr-reply` — Reply to a PR comment

Without `--comment-id`: posts a top-level conversation comment.
With `--comment-id`: replies to an inline review thread.

```bash
# General PR conversation
(cd agent-utils && poe gh-pr-reply <pr-number> --body "Your reply")

# Reply to inline review comment
(cd agent-utils && poe gh-pr-reply <pr-number> --body "Fixed." --comment-id <comment_id>)
```

---

### `gh-pr-checks` — Check PR CI status

```bash
(cd agent-utils && poe gh-pr-checks <pr-number>)
```

---

## Configuration

`agent-utils/.env` must define:

```
GITHUB_OWNER=<org-or-username>
GITHUB_REPO=<repo-name>
TASK_BRANCH_PREFIX=task/
```

Run `(cd agent-utils && poe configure)` to create `.env` from the template.

## Rule

**Never use raw `git commit`, `git push`, or `gh pr create/api` for these operations.** Use the poe tasks above. They enforce safe defaults (correct git identity, branch prefix checks, consistent repo targeting).
