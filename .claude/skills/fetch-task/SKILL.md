---
name: fetch-task
description: "Fetch the next task to work on from a specific Jira board column. Use when asked to pick a task, find the next issue, or fetch from a column."
---

# Fetching Tasks from Jira

## Board Columns (Statuses)

The GFD board has these columns, in order:

| Column      | Status name  | Meaning                                    |
|-------------|--------------|--------------------------------------------|
| Planning    | `Planning`   | Needs implementation planning              |
| To Do       | `To Do`      | Approved and ready to implement            |
| In Progress | `In Progress`| Currently being implemented                |
| Review      | `Review`     | PR open, awaiting review                   |
| Done        | `Done`       | Merged to mainline                         |
| Invalid     | `Invalid`    | Cancelled or not applicable                |

## How to Fetch from a Column

Use the **exact status name** from the table above. Do not guess or substitute column names.

```
jira_search(
  jql: 'project = GFD AND status = "<exact status name>" ORDER BY rank ASC',
  fields: "summary,status,priority,issuetype,parent",
  limit: 1
)
```

**Key rules:**

1. **Use `ORDER BY rank ASC`** — this returns issues in board order (top-most first). Do not use `ORDER BY created` or any other ordering.
2. **`limit: 1`** to get the top-most issue. Increase only if the user asks for more.
3. **Use the exact status name** as shown in the table (e.g. `"Planning"`, not `"To Do"` when asked for the planning column).

## Checking Blockers

After fetching, always check blockers before claiming a task is available:

1. Fetch the issue with `jira_get_issue(issue_key, fields: "*all")` to get `issuelinks`.
2. Look for links with `type.inward = "is blocked by"`.
3. For each such link, check if the linked `inwardIssue` status is `Done`.
4. If any blocker is **not** Done, the task is blocked — skip it and fetch the next one.

## When the User Says "Top-Most"

"Top-most" means the first result from `ORDER BY rank ASC`. This is the issue physically at the top of the board column. Never pick a random issue or reorder by your own criteria.

## Common Mistakes to Avoid

- Searching for `status = "To Do"` when the user said "planning column" — use the exact column name.
- Using `ORDER BY created ASC` instead of `ORDER BY rank ASC` — created date ≠ board position.
- Returning multiple issues and picking one yourself — always return in rank order, take the first non-blocked one.
