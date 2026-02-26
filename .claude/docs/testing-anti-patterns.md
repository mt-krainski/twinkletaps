# Testing Anti-Patterns

Reference when writing or changing tests, adding mocks, or tempted to add test-only methods to production code.

## The Iron Laws

```
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies
```

## Anti-Pattern 1: Testing Mock Behavior

```typescript
// BAD: Testing that the mock exists
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});

// GOOD: Test real component
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

## Anti-Pattern 2: Test-Only Methods in Production

```typescript
// BAD: destroy() only used in tests
class Session {
  async destroy() { /* cleanup */ }
}

// GOOD: Test utilities handle cleanup
export async function cleanupSession(session: Session) { /* cleanup */ }
```

## Anti-Pattern 3: Mocking Without Understanding

```
BEFORE mocking any method:
  1. What side effects does the real method have?
  2. Does this test depend on any of those side effects?
  3. Do I fully understand what this test needs?

IF depends on side effects: Mock at lower level
IF unsure: Run test with real implementation FIRST
```

## Anti-Pattern 4: Incomplete Mocks

Mock the COMPLETE data structure as it exists in reality, not just fields your immediate test uses.

## Anti-Pattern 5: Integration Tests as Afterthought

Testing is part of implementation, not optional follow-up. TDD prevents this.

## Red Flags

- Assertion checks for `*-mock` test IDs
- Methods only called in test files
- Mock setup is >50% of test
- Can't explain why mock is needed
