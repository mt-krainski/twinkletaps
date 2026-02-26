---
name: test
description: "Run the full test suite (lint, unit tests, e2e tests) and report results. Use when you need a health check before review or a full test run."
---

# Test Runner

Run the project's test suite and report results clearly.

## What to Run

Run these **sequentially** from the `twinkletaps-app/` directory:

1. `npm run lint`
2. `npm run test`
3. `npm run test:e2e`

Run all three regardless of earlier failures — collect the full picture.

## Reporting

After all runs complete, produce a summary:

```
## Test Results

| Check       | Status | Details           |
|-------------|--------|-------------------|
| Lint        | ✅/❌  | N errors, N warns |
| Unit Tests  | ✅/❌  | N passed, N failed|
| E2E Tests   | ✅/❌  | N passed, N failed|
```

For failures:
- List each failing test/lint error with file path and brief description
- Clearly distinguish **test failures** (assertions, logic errors) from **environment issues** (missing browsers, broken deps)

## Environment Issues

If a command fails due to environment problems (not code issues):

1. **Flag prominently** — don't bury it
2. **Fix if you can:**
   - `npx playwright install` if browsers missing
   - `npm install` if dependencies out of date
3. **Re-run the failed command** after fixing
4. If you can't fix: report exactly what's wrong

## Rules

- Do NOT modify application code. Only run tests and fix environment issues.
- Do NOT skip any of the three checks.
- Keep output concise for passing checks, verbose for failures.
