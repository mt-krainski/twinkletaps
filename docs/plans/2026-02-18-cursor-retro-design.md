# cursor-retro — Design Document

## Purpose

A CLI tool + Cursor skill that runs weekly AI-assisted retrospectives on human-AI collaboration. Extracts conversation history from Cursor's local SQLite databases, analyzes friction points via subagents, tracks improvement outcomes over time, and actively researches solutions from reputable external repos.

## Architecture

### Components

1. **`cursor-retro` Python CLI** — Extracts and exports Cursor conversations filtered by workspace and time range. Lives at `cursor-retro/` in the monorepo root. Built with uv (from matts-python-package-template).

2. **Retrospective Skill** — `.cursor/skills/retrospective/SKILL.md` orchestrates the full retro session: runs extraction, dispatches subagents for per-conversation analysis, aggregates findings, loads history, researches solutions, and presents a structured summary for discussion.

3. **Retrospective Archive** — `.cursor/retrospectives/YYYY-MM-DD-retro.md` files committed to git. Contain retro summaries, decisions, and outcome tracking.

### Data Flow

```
Cursor SQLite DBs
    ↓ (cursor-retro extract)
<workspace>/.cursor-retro/conversations/  (gitignored)
    ↓ (skill: subagent per file)
Per-conversation friction/win summaries
    ↓ (skill: aggregate + load history)
.cursor/retrospectives/*.md (previous retros)
    ↓ (skill: targeted research)
External repos (trailofbits, obra, openai, anthropics)
    ↓ (skill: present + discuss)
.cursor/retrospectives/YYYY-MM-DD-retro.md (committed)
```

## Cursor DB Schema (Discovered)

### Workspace Resolution
- `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/workspace.json` → `{"folder": "file:///path/to/workspace"}`
- Match workspace path to find the correct `<hash>` directory

### Per-Workspace Composer List
- `~/Library/Application Support/Cursor/User/workspaceStorage/<hash>/state.vscdb` → `ItemTable` → key `composer.composerData`
- Contains `allComposers[]` with rich headers: `composerId`, `name`, `createdAt`, `createdOnBranch`, `subtitle`, `unifiedMode`, etc.

### Full Conversation Data (Global)
- `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` → `cursorDiskKV`
- `composerData:<composerId>` — conversation metadata, context, model config
- `bubbleId:<composerId>:<bubbleId>` — individual messages (type 1=user, type 2=assistant)

### Extraction Strategy
1. Find workspace storage hash by matching `workspace.json` folder to target workspace path
2. Read `allComposers` from workspace DB to get composer IDs + metadata (name, timestamps)
3. Filter by `createdAt` timestamp for time range
4. Fetch full messages from global DB using `composerData:<id>` and `bubbleId:<id>:*`
5. Skip already-exported conversations (incremental)

## CLI Interface

```
cursor-retro extract [--workspace PATH] [--since DAYS]
```

- `--workspace` — Path to workspace root. Defaults to `cwd`.
- `--since` — Only export conversations from the last N days. Defaults to `7`.
- Output: markdown files in `<workspace>/.cursor-retro/conversations/<composerId>.md`
- Incremental: skips composer IDs that already have an export file

## Skill Flow

When triggered:

1. **Extract** — Run `cursor-retro extract` (incremental, last 7 days by default)
2. **Parallel analysis** — Fire a fast subagent per conversation file to extract:
   - Friction points (repeated corrections, misunderstandings, wasted cycles)
   - What went well (smooth flows, good patterns)
   - Rule/skill adherence patterns
3. **Aggregate + history** — Main agent collects subagent results, loads all `.cursor/retrospectives/*.md` to check if past improvements helped
4. **Targeted research** — For each identified friction point, actively search external repos for solutions:
   - https://github.com/trailofbits/claude-code-config (>1k stars)
   - https://github.com/trailofbits/skills
   - https://github.com/obra/superpowers (>1k stars)
   - https://github.com/openai/skills (>1k stars)
   - https://github.com/anthropics/skills (>1k stars)
5. **Present summary** — Structured output:
   - What's going well
   - What could be improved
   - Past improvement action status (helped? didn't help? inconclusive?)
   - Targeted ideas from external research
6. **Discuss** — Open conversation about which improvements to implement
7. **Save** — Write retro summary to `.cursor/retrospectives/YYYY-MM-DD-retro.md`

## Gitignore

- `<workspace>/.cursor-retro/` — raw conversation exports (never committed)
- `.cursor/retrospectives/` — committed (retro summaries and decisions)

## Package Setup

- Location: `cursor-retro/` in monorepo root
- Template: matts-python-package-template (cookiecutter + uv)
- Python 3.12+
- Dependencies: just stdlib (sqlite3, json, os, re, datetime, argparse, pathlib)
- Dev dependencies: pytest, ruff (from template)
