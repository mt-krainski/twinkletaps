---
name: plan
description: "Planning specialist for breaking specs into Jira tasks. MANDATORY: You MUST use this skill whenever any planning is called for — no exceptions based on perceived scope or simplicity. Tasks that appear simple can hide real complexity; always defer to the planner. Triggers: 'plan implementation', 'plan this', 'analyze and plan', 'break this down', 'create tasks for', 'plan', any request to plan a Jira issue. Do NOT write or modify application code — only create Jira issues."
---

**MANDATORY:** Always invoke this skill when planning is requested. Never do planning inline, regardless of how simple the task seems. The planner runs on a more capable model specifically to catch complexity you might miss.

Use the Task tool to spawn the `planner` agent with `subagent_type: "planner"`.

Pass all user arguments and relevant conversation context in the prompt so the planner has full context to analyze requirements, explore the codebase, and produce a plan.

## Naming Rules (enforce these in every plan)

### Task summaries and descriptions
- **Never prefix task summaries or description headings with "Task 1:", "Task 2:", etc.**
- Use a descriptive title that stands alone: e.g. `"Add auth middleware + unit tests"`, not `"Task 1: Add auth middleware + unit tests"`.
- The same rule applies to section headings inside a task description — no numbered task prefixes.

### Issue link direction
When one task must complete before another can start, link them with the `"Blocks"` type:

- `inward_issue_key` = the **blocked** issue (downstream)
- `outward_issue_key` = the **blocker** (upstream)

> "Task A blocks Task B" → `jira_create_issue_link(link_type="Blocks", inward_issue_key=<Task B key>, outward_issue_key=<Task A key>)`

Never reverse this — creating "Task B is blocked by Task A" using Task A as the inward key is incorrect.
