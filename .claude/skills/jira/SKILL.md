---
name: jira
description: "Reference for all Jira operations via jira-utils CLI. MUST use this skill whenever you need to interact with Jira: fetching issues, searching, creating/updating issues, transitioning status, linking issues, managing boards/sprints/backlog, or reading project metadata. Load this skill BEFORE running any jira-utils command."
---

# Jira via jira-utils

All Jira operations should use the `jira-utils` CLI instead of MCP `gravitalforge-atlassian` tools. The CLI is installed globally via `uv tool install --editable ./jira-utils` and loads `.env` automatically from the repo root.

All output is JSON to stdout. Add `--pretty` for human-readable formatting.

## Core Commands

### `get-issue` — Fetch an issue

```bash
jira-utils get-issue --issue-key GFD-42 --pretty
jira-utils get-issue --issue-key GFD-42 --fields summary,status,issuelinks
```

### `search` — JQL search

Uses `POST /rest/api/3/search/jql`. Pagination is token-based.

```bash
jira-utils search --jql 'project = GFD ORDER BY created DESC' --limit 10 --pretty
jira-utils search --jql 'status = "In Progress"' --fields summary,status
jira-utils search --jql 'project = GFD' --next-page-token '<token>'
```

### `create-issue` — Create an issue

**IMPORTANT:** Newly created issues land in the backlog. You MUST immediately follow up with `move-to-board` to place them on the board (board ID `1` for GFD).

```bash
# Create + move to board (always do both):
jira-utils create-issue \
  --project GFD \
  --summary 'Add auth middleware' \
  --type Task \
  --pretty
# Then immediately:
jira-utils move-to-board --board-id 1 --issues GFD-<new-key>

# With all options:
jira-utils create-issue \
  --project GFD \
  --summary 'Fix login bug' \
  --type Bug \
  --description 'Login fails on mobile' \
  --assignee matt \
  --components Frontend,API \
  --additional-fields '{"priority": {"name": "High"}, "parent": {"key": "GFD-10"}}' \
  --pretty
```

### `update-issue` — Update fields

```bash
jira-utils update-issue --issue-key GFD-42 \
  --fields '{"summary": "Updated title", "assignee": {"name": "matt"}}' \
  --pretty

jira-utils update-issue --issue-key GFD-42 --components Frontend,API
```

### `transition-issue` — Change status

```bash
jira-utils transition-issue --issue-key GFD-42 --transition-id 21
jira-utils transition-issue --issue-key GFD-42 --transition-id 31 --comment 'Done!'
```

Transition IDs: `3` Planning, `11` To Do, `21` In Progress, `2` Review, `31` Done, `32` Invalid.

### `get-transitions` — List available transitions

```bash
jira-utils get-transitions --issue-key GFD-42 --pretty
```

### `add-comment` — Add a comment

```bash
jira-utils add-comment --issue-key GFD-42 --body 'Branch: task/GFD-42/add-auth'
```

---

## Linking

### `create-issue-link` — Link two issues

```bash
# GFD-10 blocks GFD-11:
jira-utils create-issue-link --type Blocks --inward GFD-10 --outward GFD-11
```

**Direction (canonical reference — other skills point here):**
- `--inward` = the issue that **does the blocking** (the upstream blocker)
- `--outward` = the issue that **is blocked** (the downstream task)

> "Task A blocks Task B" → `--inward A --outward B`

If Task A must finish before Task B can start, A is `--inward` and B is `--outward`. Never reverse this.

### `get-link-types` — List link types

```bash
jira-utils get-link-types --pretty
jira-utils get-link-types --filter block --pretty
```

---

## Agile

### `get-boards` — List boards

```bash
jira-utils get-boards --project GFD --pretty
jira-utils get-boards --name Sprint --type scrum
```

### `get-board-issues` — Issues on a board

```bash
jira-utils get-board-issues --board-id 1 --pretty
jira-utils get-board-issues --board-id 1 --jql 'status = "To Do"' --fields summary --limit 20
```

### `get-sprints` — Sprints for a board

```bash
jira-utils get-sprints --board-id 1 --pretty
jira-utils get-sprints --board-id 1 --state active
```

### `add-to-sprint` — Add issues to a sprint

```bash
jira-utils add-to-sprint --sprint-id 10 --issues GFD-42,GFD-43
```

### `move-to-board` — Move issues onto a board

```bash
jira-utils move-to-board --board-id 1 --issues GFD-42,GFD-43
```

### `move-to-backlog` — Move issues to backlog

```bash
jira-utils move-to-backlog --issues GFD-42,GFD-43
```

---

## Supporting

### `get-project-components` — List components

```bash
jira-utils get-project-components --project-key GFD --pretty
```

### `get-project-versions` — List versions

```bash
jira-utils get-project-versions --project-key GFD --pretty
```

---

## Configuration

The CLI loads `.env` from the current directory (searching upward). The repo root `.env` must define:

```
JIRA_URL=https://gravitalforge.atlassian.net
JIRA_USERNAME=<email>
JIRA_API_TOKEN=<token>
```

## Rules

**Always use `jira-utils` CLI for Jira operations.** Do not use MCP `gravitalforge-atlassian` tools (`jira_get_issue`, `jira_transition_issue`, `jira_create_issue`, etc.) as a fallback. Do not attempt raw `curl`/`httpx` calls to the Jira API.

**Never chain with `cd`.** Run `jira-utils` directly — it is installed globally via `uv tool install` and loads `.env` by searching upward from CWD. Do not use `cd /path && jira-utils ...`.

**If `jira-utils` is unavailable:** Stop and ask the user to install it with `uv tool install --editable ./jira-utils`.
