---
name: retrospective
description: Use when the user wants a weekly AI-assisted retrospective — coordinates extraction, analysis, research, and discussion of conversation friction and improvements.
---

# Weekly Retrospective Skill

Orchestrate a weekly retrospective over Cursor conversation history: extract conversations, analyze them in parallel, load past retros, research external solutions, and present a structured summary for discussion. Do not modify the extraction tool or automatically implement improvements; always discuss first.

## Prerequisites

- Run from the **workspace root**.
- Ensure `cursor-retro` is available (e.g. `uv run --project cursor-retro cursor-retro --help`).

## Step 1 — Extract

Run extraction incrementally (only new conversations since last run):

```bash
uv run --project cursor-retro cursor-retro extract --workspace . --since 7
```

Default `--since 7` limits to the last 7 days; adjust if the user wants a different window. Note: extraction is incremental — existing `.md` files in `.cursor-retro/conversations/` are skipped.

## Step 2 — Parallel analysis

For **each** `.md` file in `.cursor-retro/conversations/`, fire a **fast** subagent using the Task tool with `model: "fast"`.

**Subagent instruction (adapt per file):**  
"Read the conversation at the given path (one `.cursor-retro/conversations/*.md` file) and return a structured summary (plain text or markdown) with:

1. **Friction points:** Repeated corrections, misunderstandings, wasted cycles, rule/skill violations, unclear instructions.
2. **What went well:** Smooth flows, good patterns, effective rule or skill usage.
3. **Rule/skill adherence:** Any observations about `.cursor/rules` or `.cursor/skills` being followed or ignored."

Invoke one subagent per conversation file. Do not combine files in a single subagent. Collect all structured outputs for aggregation.

## Step 3 — Aggregate and load history

1. **Create retrospectives directory if missing:**

   ```bash
   mkdir -p .cursor/retrospectives
   ```

2. **Load past retros:** Read every `.cursor/retrospectives/*.md`. Parse out past improvement actions (e.g. "Try X", "Add rule Y", "Use skill Z").

3. **Classify past actions:** For each past action, check whether the targeted friction still appears in the current run's analysis (from Step 2). Classify as:
   - **Helped** — friction no longer appears or decreased.
   - **Didn't help** — same friction still present.
   - **Inconclusive** — not enough evidence or different context.

## Step 4 — Targeted research

For **each** distinct friction point from Steps 2–3, actively search for solutions. Use WebSearch or WebFetch with **targeted queries** (e.g. "cursor rules avoid repeated corrections", "agent skill best practices"), and search these repositories:

- https://github.com/trailofbits/claude-code-config
- https://github.com/trailofbits/skills
- https://github.com/obra/superpowers
- https://github.com/openai/skills
- https://github.com/anthropics/skills

Not passive browsing — run concrete queries per friction point and note which repo/page had relevant content.

## Step 5 — Present summary

Produce a **structured summary** in the chat with these sections:

1. **What's going well** — from "what went well" and positive adherence.
2. **What could be improved** — friction points, grouped by theme if useful.
3. **Past improvement status** — table or list: action → helped / didn't help / inconclusive.
4. **Ideas for improvement** — concrete ideas with **evidence** (which external repo or page, and what it suggests).

Keep each section concise; use bullets or short paragraphs.

## Step 6 — Discuss

Explicitly open the conversation: "Which of these improvements do you want to implement? We can prioritize by impact." Stop here. Do not proceed to Step 7 until the user responds. Not everything needs action; let the user choose.

## Step 7 — Save

1. Ensure directory exists: `mkdir -p .cursor/retrospectives`
2. Write the retro to `.cursor/retrospectives/YYYY-MM-DD-retro.md` (use today's date). Include:
   - Date
   - Summary (what's going well, what could be improved)
   - Past action status
   - Ideas for improvement (with source links/repos)
   - Any follow-up actions the user agreed to (or "None" if not yet decided).
3. Stage and commit the new file (e.g. `git add .cursor/retrospectives/YYYY-MM-DD-retro.md` and commit with message like "chore: add YYYY-MM-DD retrospective"). Use repo git identity (see commit-and-pr skill if needed).

## Checklist

- [ ] Extract run from workspace root with `cursor-retro extract`
- [ ] One fast subagent per conversation file; structured output (friction / wins / adherence)
- [ ] Past retros loaded from `.cursor/retrospectives/`; past actions classified
- [ ] Each friction point researched in the listed external repos with targeted queries
- [ ] Summary has: going well, could improve, past action status, ideas with evidence
- [ ] Discussion opened; no auto-implementation
- [ ] Retro saved to `.cursor/retrospectives/YYYY-MM-DD-retro.md` and committed
