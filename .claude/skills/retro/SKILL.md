---
name: retro
description: "Weekly AI-assisted retrospective. Coordinates extraction, analysis, research, and discussion of conversation friction and improvements."
disable-model-invocation: true
---

# Weekly Retrospective

Orchestrate a weekly retrospective: extract conversations, analyze them, load past retros, research external solutions, and present a structured summary for discussion. Do not automatically implement improvements; always discuss first.

## Prerequisites

- Run from **workspace root**.
- Ensure `cursor-retro` is available: `uv run --project cursor-retro cursor-retro --help`

## Step 1 — Extract

```bash
uv run --project cursor-retro cursor-retro extract --workspace . --since 7
```

Default `--since 7` for last 7 days. Extraction is incremental.

## Step 2 — Parallel Analysis

For each `.md` file in `.cursor-retro/conversations/`, use the Task tool to spawn a general-purpose sub-agent.

**Sub-agent instruction:** Read the conversation file and return a structured summary with:
1. **Friction points:** Repeated corrections, misunderstandings, wasted cycles, rule violations
2. **What went well:** Smooth flows, good patterns, effective rule usage
3. **Rule/skill adherence:** Observations about rules or skills being followed or ignored

One sub-agent per file. Collect all outputs.

## Step 3 — Aggregate and Load History

1. Create directory: `mkdir -p .claude/retrospectives`
2. Load past retros from `.claude/retrospectives/*.md` (last 3 months)
3. For each past action, classify:
   - **Helped** — friction no longer appears (only mark once)
   - **Didn't help** — friction still present

## Step 4 — Targeted Research

For each friction point, search for solutions using web search with targeted queries. Search these repositories:
- https://github.com/trailofbits/claude-code-config
- https://github.com/trailofbits/skills
- https://github.com/obra/superpowers

## Step 5 — Present Summary

Structured summary:
1. **What's going well** — from positive findings
2. **What could be improved** — friction points, grouped by theme
3. **Past improvement status** — action -> helped / didn't help
4. **Ideas for improvement** — top 5, with evidence (source repo/page)

## Step 6 — Discuss

"Which of these improvements do you want to implement? We can prioritize by impact."

Stop here. Do not proceed until user responds.

## Step 7 — Save

1. Write retro to `.claude/retrospectives/YYYY-MM-DD-retro.md`
2. Include: date, summary, past action status, ideas, agreed actions
3. Stage the retro file: `git add .claude/retrospectives/YYYY-MM-DD-retro.md`
4. `poe -C agent-utils git-commit -m "retro: YYYY-MM-DD retrospective"`
5. `poe -C agent-utils git-push`
