---
name: plan
description: "Planning specialist — analyzes requirements, explores the codebase, and produces implementation plans. MANDATORY: You MUST use this skill whenever any planning is called for — no exceptions based on perceived scope or simplicity. Tasks that appear simple can hide real complexity; always defer to the planner. Triggers: 'plan implementation', 'plan this', 'analyze and plan', 'break this down', 'create tasks for', 'plan', any request to plan a Jira issue. Do NOT write or modify application code."
---

## Step 1: Spawn the Planner

Use the Agent tool to spawn the `planner` agent with `subagent_type: "planner"`.

Pass all user arguments and relevant conversation context in the prompt so the planner has full context to analyze requirements, explore the codebase, and produce a plan.

**Do not explore the codebase or draft a plan yourself.** The planner agent does all analysis. Wait for it to return.

## Step 2: Deliver the Plan

The planner agent returns a structured plan. What you do with it depends on context.

### Interactive mode (normal conversation)

1. Present the plan to the user.
2. **Wait for human approval before proceeding.** Do not create Jira issues until explicitly approved.
3. After approval: follow the Post-Approval flow below (simple or complex path).

### Ticket-loop mode (non-interactive)

Detect this mode when the prompt mentions "ticket-loop" or "invoked through a script".

1. Write the plan to the Jira task description using `jira-utils update-issue`.
2. Reassign the task to the human (use `--assignee "Matt Krainski"` — `jira-utils` resolves the display name).
3. Transition the task to Plan Review (transition ID `4`) using `jira-utils transition-issue`.
4. If you have questions, write your plan so far into the Jira ticket, ask questions as a comment, and reassign to the human.
5. **Stop.** Do not create implementation tickets — that happens after the human approves the plan.

## Post-Approval

After human approves the plan, determine whether this is a simple or complex task:

### Simple task (single implementation task)

If the plan results in a single implementation task (no epic needed):

1. Update the planning task's description with the implementation plan using `jira-utils update-issue`.
2. Transition the planning task to **To Do** (transition ID `11`).

The planning task itself becomes the implementation task.

### Complex task (epic with multiple tasks)

If the plan requires multiple tasks:

1. Create a Jira Epic if one doesn't already exist:
   ```bash
   jira-utils create-issue --project GFD --type Epic --summary '[feature name]'
   jira-utils move-to-board --board-id 1 --issues GFD-[new-key]
   ```
2. For each task, create a Task and move it to the board:
   ```bash
   jira-utils create-issue --project GFD --type Task --summary '[task title]' --description '[description]' --additional-fields '{"parent": {"key": "GFD-###"}}'
   jira-utils move-to-board --board-id 1 --issues GFD-[new-key]
   ```

Issue IDs are auto-assigned by Jira. Tasks are created in `To Do` status by default.

**IMPORTANT:** Newly created issues land in the backlog. You MUST follow up with `move-to-board` after each `create-issue` call.

After all issues are created, wire up blocking relationships for every dependency:
```bash
jira-utils create-issue-link --type Blocks --inward [blocker-key] --outward [blocked-key]
```
`--inward` = the blocker; `--outward` = the blocked issue. Create one call per dependency pair.

After creating all issues, transition the planning task to Done (transition ID `31`).

Present: **"Issues created in Jira. Which task should I start?"**

## Task Description Template

Each Task description must include: Problem/Goal, Non-Goals, Acceptance Criteria, Repo Context, Implementation Plan, Test Plan, Verification Notes, Risk/Rollback.

**Quality rules:** Read `.claude/docs/quality-checklist.md` and ensure planned implementations comply. If any planned approach would violate a checklist rule, fix the plan so it complies.

Each story's **Implementation Plan** should include:
- Exact file paths for every file to create or modify
- Code snippets showing the key implementation (not "add validation" — show the actual code)
- Exact test commands with expected output
- TDD steps: write failing test -> verify fail -> implement -> verify pass

## Jira Description Workaround

Never use literal angle brackets (`<...>`) in Jira descriptions — they may be misinterpreted as HTML tags and silently truncated. Use square brackets instead: `[placeholder]`, `[script]`, `[your-value]`.

## Naming Rules (enforce these in every plan)

### Task summaries and descriptions
- **Never prefix task summaries or description headings with "Task 1:", "Task 2:", etc.**
- Use a descriptive title that stands alone: e.g. `"Add auth middleware + unit tests"`, not `"Task 1: Add auth middleware + unit tests"`.
- The same rule applies to section headings inside a task description — no numbered task prefixes.

### Issue link direction

See the `/jira` skill for link direction (`--inward` = blocker, `--outward` = blocked). Never reverse this.
