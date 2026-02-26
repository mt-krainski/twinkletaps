---
name: tdd
description: "Full TDD procedure with examples. Use when implementing features or bugfixes, before writing implementation code. Core cycle: write failing test, watch it fail, implement minimal code."
---

# Test-Driven Development (TDD)

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over. No exceptions.

## Red-Green-Refactor

1. **RED** — Write failing test -> Verify it fails correctly
2. **GREEN** — Write minimal code -> Verify it passes
3. **REFACTOR** — Clean up, keep tests green
4. **Next** — Repeat for next behavior

### RED - Write Failing Test

Write one minimal test showing what should happen.

```typescript
// GOOD: Clear name, tests real behavior, one thing
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };
  const result = await retryOperation(operation);
  expect(result).toBe('success');
  expect(attempts).toBe(3);
});

// BAD: Vague name, tests mock not code
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(2);
});
```

Requirements: one behavior, clear name, real code (no mocks unless unavoidable).

### Verify RED — Watch It Fail (MANDATORY)

```bash
npm test path/to/test.test.ts
```

Confirm: test fails (not errors), failure message is expected, fails because feature missing (not typos).

### GREEN — Minimal Code

Write simplest code to pass. Don't add features, refactor, or "improve" beyond the test.

### Verify GREEN (MANDATORY)

Confirm: test passes, other tests still pass, output pristine.

### REFACTOR

After green only: remove duplication, improve names, extract helpers. Keep tests green.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is debt. |
| "TDD will slow me down" | TDD faster than debugging. |

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write wished-for API. Write assertion first. |
| Test too complicated | Design too complicated. Simplify interface. |
| Must mock everything | Code too coupled. Use dependency injection. |

## Testing Anti-Patterns

Reference: `.claude/docs/testing-anti-patterns.md`

- Never test mock behavior — test real behavior
- Never add test-only methods to production classes
- Mock minimally, understand dependencies first
- Mirror real API structures in mocks completely

## Debugging Integration

Bug found? Write failing test reproducing it. Follow TDD cycle. Never fix bugs without a test.
