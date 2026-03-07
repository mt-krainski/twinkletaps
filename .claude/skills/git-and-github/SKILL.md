---
name: git-and-github
description: "MANDATORY for ALL git and GitHub operations. Do NOT use raw git or gh commands — load this skill FIRST to get the correct agent-utils command. Covers: committing, pushing, creating PRs, listing/viewing PRs, fetching PR feedback, checking CI status, and replying to PR comments."
---

# Git and GitHub via agent-utils

All git commit/push and GitHub PR operations must use the `agent-utils` CLI instead of raw `git`/`gh` commands. The CLI is installed globally via `uv tool install --editable ./agent-utils` and loads `.env` automatically from the repo root.

## Shell Quoting Rule

**Always use single quotes** for `-m` and `--body` arguments. Double quotes let the shell interpret backticks, `$`, `<>`, and other metacharacters, breaking commands with rich text.

If the text contains an apostrophe, escape it as `'\''` (end single-quoted string, insert escaped literal quote, resume single-quoted string).

Example: `'Don'\''t break this'` produces the string `Don't break this`.

## Available Commands

### `git-commit` — Create a commit

Sets `GIT_AUTHOR_*` and `GIT_COMMITTER_*` from repo `git config` automatically. Fails if nothing is staged.

```bash
agent-utils git-commit -m '<message>'
```

**Message format:** `<ISSUE_KEY>: <short title>` with optional body (bullets). Example:

```bash
agent-utils git-commit -m 'GFD-42: Add device service

- Replace team.ts with device.ts
- Update WorkspaceProvider to expose devices'
```

---

### `git-push` — Push current branch

Pushes with `-u origin <branch>`. Refuses `main`/`master` and branches that don't start with `task/`.

```bash
agent-utils git-push
```

---

### `gh-pr-create` — Open a pull request

Reads `GITHUB_OWNER` and `GITHUB_REPO` from `.env`.

```bash
agent-utils gh-pr-create \
  --base <base-branch> \
  --title '[GFD-###] <Title>' \
  --body '<body>'
```

---

### `gh-pr-list` — List pull requests

Lists PRs for the repo. Optionally filter by head branch name.

```bash
# List all open PRs
agent-utils gh-pr-list

# Filter by head branch
agent-utils gh-pr-list --head 'task/GFD-42/my-feature'
```

---

### `gh-pr-view` — View a PR by number or branch name

Returns PR details as JSON. The `ref` argument can be a PR number or branch name.

```bash
# View by PR number
agent-utils gh-pr-view 123

# View by branch name
agent-utils gh-pr-view 'task/GFD-42/my-feature'

# Select specific fields
agent-utils gh-pr-view 123 --fields 'number,title,state,url'
```

---

### `gh-pr-fetch` — Fetch all PR feedback

Returns combined JSON with `inline_comments`, `reviews`, and `conversation`.

```bash
agent-utils gh-pr-fetch <pr-number>
```

---

### `gh-pr-reply` — Reply to a PR comment

Without `--comment-id`: posts a top-level conversation comment.
With `--comment-id`: replies to an inline review thread.

```bash
# General PR conversation
agent-utils gh-pr-reply <pr-number> --body 'Your reply'

# Reply to inline review comment
agent-utils gh-pr-reply <pr-number> --body 'Fixed.' --comment-id <comment_id>
```

---

### `gh-pr-checks` — Check PR CI status

```bash
agent-utils gh-pr-checks <pr-number>
```

---

## Configuration

The CLI loads `.env` from the current directory (searching upward). The repo root `.env` must define:

```
GITHUB_OWNER=<org-or-username>
GITHUB_REPO=<repo-name>
TASK_BRANCH_PREFIX=task/
```

## Rule

**Never use raw `git commit`, `git push`, or `gh pr create/api` for these operations.** Use the `agent-utils` commands above. They enforce safe defaults (correct git identity, branch prefix checks, consistent repo targeting).

**If `agent-utils` is unavailable:** Do not attempt to work around it by invoking raw `git` or `gh` directly. Instead, stop and notify the user that `agent-utils` is not installed and ask them to run `uv tool install --editable ./agent-utils`.
