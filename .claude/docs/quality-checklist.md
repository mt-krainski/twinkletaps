# Project Quality Checklist

Shared rules that apply across implementation, code review, and planning. This file is the single source of truth — skills reference it, not the other way around.

## Code Rules

- **No `process.env` in application code.** Always use the `config` object from `src/lib/config.ts`. Add new env vars as config properties.
- **No conditional test skipping.** Tests must NEVER use `describe.skip`, `test.skip`, or conditional wrappers (e.g. `describeIfReady`) that skip when config/env vars are missing. Tests must fail loudly if their environment is broken.
- **No dead code or commented-out blocks.** Remove unused code entirely. No `// removed` markers.
- **Database migrations use Supabase** (`supabase/migrations/`), not Prisma. Prisma is ORM/client only.
- **Container/view pattern for shell components.** Navbar, Sidebar, etc. use thin containers that pass props to presentational views. Stories target the View.

## Testing Rules

- **Test real behavior, not mocks.** Mock only external boundaries (APIs, DB). Never mock the unit under test.
- **Never add test-only methods** to production classes.
- **Every behavior change needs tests** OR a documented reason + manual verification.

## CLI Rules

- **Use `agent-utils` wrappers** for git/gh operations. Never raw `git commit`, `git push`, or `gh`.
- **Use `--pretty`** on all `jira-utils` output commands.
- **Run `--help` before first use** of any CLI command (`agent-utils`, `jira-utils`) in a session. Do not guess flag names or argument order.
- **No shell chaining.** Never use `&&`, `||`, `;`, `|`, `>`, `$()`, or backticks. Run each command separately.

## Workflow Rules

- **PRs always target `main`**, never stale feature branches.
- **Never squash/rebase commits.** User squashes at merge time. WIP commits are fine.
- **`/wrap` is the single exit point** for all code changes. Never use `/commit` directly to finalize work.
- **Never transition to Done** until the PR is merged to mainline.
