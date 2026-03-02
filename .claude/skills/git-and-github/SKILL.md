---
name: git-and-github
description: "Reference for all git and GitHub operations via agent-utils poe tasks. Use this to look up the correct command for committing, pushing, creating PRs, fetching PR feedback, or replying to PR comments."
---

# Git and GitHub via agent-utils

All git commit/push and GitHub PR operations must use the poe tasks in `agent-utils/` instead of raw `git`/`gh` commands. Run them from the repo root with `poe -C agent-utils <task>`.

## Available Poe Tasks

### `git-commit` — Create a commit

Sets `GIT_AUTHOR_*` and `GIT_COMMITTER_*` from repo `git config` automatically. Fails if nothing is staged.

```bash
poe -C agent-utils git-commit -m "<message>"
```

**Message format:** `<ISSUE_KEY>: <short title>` with optional body (bullets). Example:

```
poe -C agent-utils git-commit -m "GFD-42: Add device service

- Replace team.ts with device.ts
- Update WorkspaceProvider to expose devices"
```

---

### `git-push` — Push current branch

Pushes with `-u origin <branch>`. Refuses `main`/`master` and branches that don't start with `task/`.

```bash
poe -C agent-utils git-push
```

---

### `gh-pr-create` — Open a pull request

Reads `GITHUB_OWNER` and `GITHUB_REPO` from `agent-utils/.env`.

```bash
poe -C agent-utils gh-pr-create \
  --base <base-branch> \
  --title "[GFD-###] <Title>" \
  --body "<body>"
```

---

### `gh-pr-fetch` — Fetch all PR feedback

Returns combined JSON with `inline_comments`, `reviews`, and `conversation`.

```bash
poe -C agent-utils gh-pr-fetch <pr-number>
```

---

### `gh-pr-reply` — Reply to a PR comment

Without `--comment-id`: posts a top-level conversation comment.
With `--comment-id`: replies to an inline review thread.

```bash
# General PR conversation
poe -C agent-utils gh-pr-reply <pr-number> --body "Your reply"

# Reply to inline review comment
poe -C agent-utils gh-pr-reply <pr-number> --body "Fixed." --comment-id <comment_id>
```

---

### `gh-pr-checks` — Check PR CI status

```bash
poe -C agent-utils gh-pr-checks <pr-number>
```

---

## Configuration

`agent-utils/.env` must define:

```
GITHUB_OWNER=<org-or-username>
GITHUB_REPO=<repo-name>
TASK_BRANCH_PREFIX=task/
```

Run `poe -C agent-utils configure` to create `.env` from the template.

## Rule

**Never use raw `git commit`, `git push`, or `gh pr create/api` for these operations.** Use the poe tasks above. They enforce safe defaults (correct git identity, branch prefix checks, consistent repo targeting).

**If poe or agent-utils is unavailable:** Do not attempt to work around it by invoking raw `git` or `gh` directly. Instead, stop and notify the user that the poe task cannot be run and ask them to verify that `agent-utils` is set up correctly.
