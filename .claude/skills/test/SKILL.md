---
name: test
description: "Run the full test suite (lint, unit tests, e2e tests) and report results. Use when you need a health check, a full test run, before committing, before creating PRs, when asked to 'run tests', 'check if tests pass', or 'run the test suite'."
---

# Run Full Test Suite

Run all checks and report results with evidence. No claims without output.

## Steps

### 1. Lint

```bash
npm run lint
```

### 2. Unit / Integration Tests

```bash
npm run test
```

### 3. E2E Tests

```bash
npm run test:e2e
```

## Reporting

After all three complete, summarize:

```
Test Suite Results:
- Lint: PASS/FAIL (N errors, N warnings)
- Unit tests: PASS/FAIL (N passed, N failed, N skipped)
- E2E tests: PASS/FAIL (N passed, N failed)
```

If any step fails, include the relevant error output. Flag test failures prominently — they are urgent.

## Rules

- Run all three steps even if an earlier one fails (gather full picture).
- If a failure looks related to current changes, investigate and fix.
- If a failure looks environmental (flaky test, infrastructure), try fixing. If you can't, report it clearly.
- Never claim tests pass without fresh command output from this run.
