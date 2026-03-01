---
name: plan
description: "Planning specialist for breaking specs into Jira tasks. MANDATORY: You MUST use this skill whenever any planning is called for — no exceptions based on perceived scope or simplicity. Tasks that appear simple can hide real complexity; always defer to the planner. Triggers: 'plan implementation', 'plan this', 'analyze and plan', 'break this down', 'create tasks for', 'plan', any request to plan a Jira issue. Do NOT write or modify application code — only create Jira issues."
---

**MANDATORY:** Always invoke this skill when planning is requested. Never do planning inline, regardless of how simple the task seems. The planner runs on a more capable model specifically to catch complexity you might miss.

Use the Task tool to spawn the `planner` agent with `subagent_type: "planner"`.

Pass all user arguments and relevant conversation context in the prompt so the planner has full context to analyze requirements, explore the codebase, and produce a plan.
