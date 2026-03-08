---
name: fetch-task
description: "Fetch the next task to work on from a specific Jira board column. Use when asked to pick a task, find the next issue, or fetch from a column."
---

# Fetching Tasks from Jira

## How to Fetch from a Column

Board columns and their exact status names are defined in the `/workflow` skill. Use the **exact status name** (e.g. `"Planning"`, `"To Do"`, `"In Progress"`, `"Review"`, `"Done"`). Do not guess or substitute column names.

```bash
jira-utils search --jql 'project = GFD AND status = "<exact status name>" ORDER BY rank ASC' --fields summary,status,priority,issuetype,parent --limit 1
```

**Key rules:**

1. **Use `ORDER BY rank ASC`** — this returns issues in board order (top-most first). Do not use `ORDER BY created` or any other ordering.
2. **`limit: 1`** to get the top-most issue. Increase only if the user asks for more.
3. **Use the exact status name** as shown in the table (e.g. `"Planning"`, not `"To Do"` when asked for the planning column).

When selecting a non-blocked task, use the algorithm below instead of this bare query.

## Algorithm for Non-Blocked Task Selection

Use this offset-based loop to find the first non-blocked issue in rank order. Do not deviate from these steps.

1. Set `offset = 0`.
2. Query the column: `jira-utils search --jql 'project = GFD AND status = "<column>" ORDER BY rank ASC' --fields summary,status,priority,issuetype,parent --limit 1` (use `--next-page-token` for offset pagination).
3. If no results: stop — no available tasks in this column (all remaining issues may be blocked, or the column is empty).
4. Fetch the full issue: `jira-utils get-issue --issue-key <KEY>` to get `issuelinks`.
5. Check for active blockers: find links where `type.inward = "is blocked by"`. For each such link, check `inwardIssue.fields.status.name`. If it is not `"Done"`, the blocker is active.
6. If any blocker is **not** Done: increment `offset` by 1 and go to Step 2.
7. Return this issue — it is the top-most non-blocked task.

**"Top-most"** means the first result from `ORDER BY rank ASC` — the issue physically at the top of the board column. Never pick a random issue or reorder by your own criteria.

## Common Mistakes to Avoid

- Searching for `status = "To Do"` when the user said "planning column" — use the exact column name.
- Using `ORDER BY created ASC` instead of `ORDER BY rank ASC` — created date ≠ board position.
- **Picking a random issue** instead of iterating from offset 0 in rank order — always follow the algorithm above.
- Returning multiple issues and picking one yourself — always iterate in rank order, take the first non-blocked one.
- Skipping the blocker check step — a task is not available just because it appears at the top of the column.
