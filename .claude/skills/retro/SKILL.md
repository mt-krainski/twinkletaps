---
name: retro
description: "Weekly AI-assisted retrospective. Analyzes Claude Code session transcripts for friction, successes, and rule adherence, then presents a structured summary for discussion."
---

# Weekly Retrospective

Analyze recent Claude Code sessions, load past retros, research external solutions, and present a structured summary for discussion. Do not automatically implement improvements; always discuss first.

## Prerequisites

- Run from **workspace root**.

## Step 1 — Identify Recent Sessions

Session transcripts are JSONL files at:
`~/.claude/projects/-Users-mateusz-Projects-twinkletaps/*.jsonl`

List all `.jsonl` files sorted by modification time. Filter to sessions modified in the last 7 days (or a user-specified period). Each file is one session identified by its UUID filename.

To check a session's timeframe, read the first few lines — each line is a JSON object with a `timestamp` field (ISO 8601).

## Step 2 — Parallel Analysis

For each recent session JSONL file, use the Agent tool to spawn a sub-agent.

**Sub-agent instruction:** Read the session JSONL file. Each line is a JSON object. Focus on lines where `type` is `"user"` or `"assistant"` — the `message.content` field contains the conversation text (user prompts, assistant responses, tool calls and results). Return a structured summary with:
1. **Friction points:** Repeated corrections, misunderstandings, wasted cycles, rule violations, permission denials, wrong approaches
2. **What went well:** Smooth flows, good patterns, effective skill/rule usage
3. **Rule/skill adherence:** Observations about CLAUDE.md rules or skills being followed or ignored

One sub-agent per file. Collect all outputs.

## Step 3 — Collect Recent Skill/Config Changes

Run `git log --since="7 days ago" --name-only -- .claude/skills/ .claude/CLAUDE.md CLAUDE.md` to see what skills or config files changed during the retro period. For each changed file, read the diff (`git diff HEAD~N -- <file>`) to understand what was fixed or added.

When aggregating friction points from Step 2, cross-reference against these changes. If a friction point appears in an early session but was already addressed by a skill/config change later in the week, mark it as **"Already fixed (commit <hash>)"** rather than proposing it as a new improvement.

## Step 4 — Aggregate and Load Retro History

1. Create directory if needed: `mkdir -p .claude/retrospectives`
2. Load past retros from `.claude/retrospectives/*.md` (last 3 months)
3. For each past action, classify:
   - **Helped** — friction no longer appears (only mark once)
   - **Didn't help** — friction still present

## Step 5 — Targeted Research

For each friction point, search for solutions using web search with targeted queries. Search these repositories:
- https://github.com/trailofbits/claude-code-config
- https://github.com/trailofbits/skills
- https://github.com/obra/superpowers

## Step 6 — Present Summary

Structured summary:
1. **What's going well** — from positive findings
2. **What could be improved** — friction points, grouped by theme
3. **Past improvement status** — action -> helped / didn't help
4. **Ideas for improvement** — top 5, with evidence (source repo/page)

## Step 7 — Discuss

"Which of these improvements do you want to implement? We can prioritize by impact."

Stop here. Do not proceed until user responds.

## Step 8 — Save

1. Write retro to `.claude/retrospectives/YYYY-MM-DD-retro.md`
2. Include: date, summary, past action status, ideas, agreed actions
3. Use the `/commit` skill to commit and push.
