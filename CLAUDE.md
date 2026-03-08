# Project Configuration

## Project Overview

This is a simple Arduino project with a Next.js web app. Modern development practices with a focus on performance and developer experience.

## Project Conventions

- **Component layout:** `src/components/ui/` — shadcn primitives (unchanged). `src/components/app/` — app components (shell and domain content); each in its own dir with `ComponentName.tsx`, stories, and `index.ts`. `src/components/providers/` — context providers.
- **Container/view:** Shell components (e.g. Navbar, Sidebar) that read from context use a thin container (`Navbar.tsx`, `Sidebar.tsx`) that passes props to a presentational view (`NavbarView.tsx`, `SidebarView.tsx`). Stories target the View.
- Use `npm` as the package and script runner (see Behavioral Rules for the full policy on package scripts).
- **Database migrations** use Supabase (`supabase/migrations/`), NOT Prisma. Prisma is ORM/client only.
- **Tests:** `npm run test` (unit/integration), `npm run test:e2e` (e2e), `npm run lint` (lint). Run `test` for quick check, `test:e2e` for final check.
- **Selectively blocked commands:** Not all Bash commands are available — some are blocked by permission policy (e.g. `gh`, `git commit`, `git push`). When a command is denied, use the corresponding `agent-utils` wrapper instead (e.g. `agent-utils gh-pr-list`, `agent-utils gh-pr-checks`, `agent-utils git-commit`). Load the `/git-and-github` skill for the full command reference. Do not assume Bash itself is disabled — try the command, and if it's blocked, reach for agent-utils.

## CI

Root `.github/workflows/ci.yml` is deprecated. New packages add dedicated workflows (e.g. `package-name--ci.yml`). See `cursor-retro--ci.yml` or `twinkletaps-app--ci.yml` for the pattern.

## Behavioral Rules

- Be cool and casual. No overexaggerated phrases ("You're absolutely right!").
- Don't modify readme or write docs unless explicitly asked.
- Prefer copying/moving files over deleting and reconstructing.
- Clean code: comments explain "why" not "what". Exception: test/story files allow brief "what" comments.
- Analyze codebase patterns before bigger changes and follow them.
- If functions moved in a change chain, don't move them back without good reason.
- **Prefer package scripts over arbitrary commands.** Before running any tool or CLI command, check `package.json` `scripts` for an equivalent. Use `npm run <script>` instead of `npx <tool>`, `yarn dlx`, or direct binary invocations. If a script exists, always use it — never call the underlying binary directly.
- **Shell commands:** In run/shell commands, avoid: &&, ||, ;, |, >, $(), and backticks. These break wildcard matching and trigger explicit approval. Prefer single commands or separate invocations.
- **File reading:** Always use the `Read` tool to read files rather than `cat` via Bash. To check if a file exists before reading, use `Read` and handle the error gracefully.
- **Test failures are urgent.** Flag prominently. Fix if related to your changes. If environmental, try fixing. Otherwise make it clearly visible.
- **No guessing.** Never guess API signatures, library behavior, migration tooling, or root causes. Verify by reading source, checking docs, or running commands. If unsure, say so and investigate.
- **Always use the `/commit` skill when committing.** Never run `git commit` / `git push` ad-hoc — invoke the skill so its rules (staging, message format, explicit branch push, PR creation) are followed consistently.

### Custom scripts

Use these wrapper scripts instead of raw shell commands:

- `agent-utils/scripts/run-with-tail.sh <lines> <cmd> [args...]` — run any allowed command and tail output (equivalent to `<cmd> 2>&1 | tail -n <lines>`)
- `agent-utils/scripts/find-grep.sh <pattern> [directory] [lines]` — search source files for a pattern, return matching files (default directory: `src`, default lines: 20)

## Core Development Principles

These always apply. Each has a dedicated skill with the full procedure — load the skill when doing the activity.

- **TDD:** Write test first, watch it fail, implement minimal code. No production code without a failing test. See `/tdd`.
- **Debugging:** Find root cause before attempting fixes. No random fix attempts. If 3+ fixes fail, stop and question the architecture. See `/debug`.
- **Verification:** No completion claims without fresh evidence. Run the command, read the output, then claim the result. See `/verify`.
- **Code review:** Verify feedback before implementing. Push back when wrong. No performative agreement. See `/address-pr`.
- **Testing anti-patterns:** Test real behavior, not mocks. Mock minimally. Never add test-only methods to production classes. See `/tdd`.

## Quality Bar (Non-Negotiables)

- Follow existing architecture and naming conventions. Prefer reuse over invention.
- No dead code, commented-out blocks, or temporary hacks without task notes.
- Every behavior change needs tests OR documented reason + manual verification.
- Keep diffs reviewable — no large mechanical refactors mixed with feature work.
