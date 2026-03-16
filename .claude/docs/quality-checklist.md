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

