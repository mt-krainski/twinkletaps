# ticket-loop

Autonomous Jira task processor. Fetches the board state via Claude CLI, picks the highest-priority task assigned to the agent, and dispatches it to the appropriate handler.

## How it works

1. Fetches all active Jira issues (structured output via `claude` CLI)
2. Scans columns in priority order: **Review > Planning > To Do** (In Progress is skipped)
3. Picks the top-ranked task assigned to `JIRA_AGENT_USERNAME`
4. Dispatches based on column:
   - **Review** — addresses PR/Jira feedback, commits, reassigns to human
   - **Planning** — breaks down work into smaller Jira tasks
   - **To Do** — implements the task, creates a PR
5. WIP limits prevent overloading downstream columns (to_do: 15, review: 3)

Session IDs are persisted in `sessions.jsonl` so review handlers resume in the same Claude session that implemented the task.

## Setup

```sh
poe configure   # installs deps, creates .env template
```

Fill in `.env`:

| Variable              | Description                                     |
| --------------------- | ----------------------------------------------- |
| `JIRA_AGENT_USERNAME` | Jira display name the agent matches on          |
| `HUMAN_ATLASSIAN_ID`  | Jira username to reassign tasks to after review |
| `BASE_BRANCH`         | Branch to develop from and target PRs against   |

## Usage

From the monorepo root:

```sh
uv run --project ticket-loop ticket-loop
```

To drop into the Claude session for a specific Jira issue (e.g. after the loop
started it or for manual follow-up):

```sh
uv run --project ticket-loop ticket-loop --resume GFD-42
```

## Development

```sh
poe test    # run tests with coverage
poe lint    # ruff check + format
```
