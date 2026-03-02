# Project Configuration

## Project Overview

This is a simple Arduino project with a Next.js web app. Modern development practices with a focus on performance and developer experience.

## Project Conventions

- **Component layout:** `src/components/ui/` — shadcn primitives (unchanged). `src/components/app/` — app components (shell and domain content); each in its own dir with `ComponentName.tsx`, stories, and `index.ts`. `src/components/providers/` — context providers.
- **Container/view:** Shell components (e.g. Navbar, Sidebar) that read from context use a thin container (`Navbar.tsx`, `Sidebar.tsx`) that passes props to a presentational view (`NavbarView.tsx`, `SidebarView.tsx`). Stories target the View.
- Use `npm` as the package and script runner. Prefer `npm run` over `npx`.
- **Database migrations** use Supabase (`supabase/migrations/`), NOT Prisma. Prisma is ORM/client only.
- **Tests:** `npm run test` (unit/integration), `npm run test:e2e` (e2e), `npm run lint` (lint). Run `test` for quick check, `test:e2e` for final check.

## CI

Root `.github/workflows/ci.yml` is deprecated. New packages add dedicated workflows (e.g. `package-name--ci.yml`). See `cursor-retro--ci.yml` or `twinkletaps-app--ci.yml` for the pattern.

## Behavioral Rules

- Be cool and casual. No overexaggerated phrases ("You're absolutely right!").
- Don't modify readme or write docs unless explicitly asked.
- Prefer copying/moving files over deleting and reconstructing.
- Clean code: comments explain "why" not "what". Exception: test/story files allow brief "what" comments.
- Analyze codebase patterns before bigger changes and follow them.
- If functions moved in a change chain, don't move them back without good reason.
- Prefer package scripts over generic commands.
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

These always apply. Detailed procedures available as skills (`/tdd`, `/debug`, `/verify`).

### Test-Driven Development

- **Write test first. Watch it fail. Implement minimal code to pass.** No production code without a failing test.
- If you wrote code before the test: delete it. Start over with TDD. No exceptions.
- Red-Green-Refactor cycle: failing test -> minimal implementation -> clean up.

### Systematic Debugging

- **Find root cause before attempting fixes.** No random fix attempts.
- Read errors carefully. Reproduce consistently. Check recent changes. Trace data flow.
- One hypothesis at a time. Smallest possible change to test it.
- If 3+ fixes fail: stop and question the architecture. Discuss before continuing.

### Verification Before Completion

- **No completion claims without fresh verification evidence.** Run the command. Read the output. Then claim the result.
- If you haven't run the verification command in this message, you cannot claim it passes.
- Red flags: "should work", "probably", "seems to", expressing satisfaction before verification.

### Receiving Code Review

- Verify feedback before implementing. No performative agreement ("You're absolutely right!", "Great point!").
- Push back with technical reasoning when suggestions are wrong or violate YAGNI.
- If any feedback is unclear: stop, ask for clarification on all unclear items before implementing any.
- Implementation order: blocking issues -> simple fixes -> complex fixes. Test each individually.

### Testing Anti-Patterns

- Never test mock behavior — test real component behavior.
- Never add test-only methods to production classes — use test utilities.
- Mock minimally and understand dependencies before mocking.
- Incomplete mocks hide structural assumptions — mirror real API structures completely.

## Quality Bar (Non-Negotiables)

- Follow existing architecture and naming conventions. Prefer reuse over invention.
- No dead code, commented-out blocks, or temporary hacks without task notes.
- Every behavior change needs tests OR documented reason + manual verification.
- Keep diffs reviewable — no large mechanical refactors mixed with feature work.
