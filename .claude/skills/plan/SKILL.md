---
name: plan
description: "Planning specialist for breaking specs into Jira tasks. Use when asked to analyze a feature, break down requirements, or create implementation tasks. Do NOT write or modify application code — only create Jira issues."
---

Use the Task tool to spawn the `planner` agent with `subagent_type: "planner"`.

Pass all user arguments and relevant conversation context in the prompt so the planner has full context to analyze requirements, explore the codebase, and produce a plan.
