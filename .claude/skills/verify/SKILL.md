---
name: verify
description: "Verification before claiming completion. Use before saying 'done', before claiming work is complete, before committing, before creating PRs, or before claiming tests pass. Evidence before assertions, always."
---

# Verification Before Completion

## Why Fresh Evidence?

Stale results lie. Code changes between runs, environments drift, tests get added. The only way to know the current state is to check the current state. If you haven't run the verification command in this message, you cannot claim it passes.

## The Gate Function

```
BEFORE claiming any status:
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - NO: State actual status with evidence
   - YES: State claim WITH evidence
5. ONLY THEN: Make the claim
```

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing |
| Bug fixed | Test original symptom | Code changed, assumed fixed |
| Task completed | VCS diff shows changes | Delegate reports "success" |

## Watch For

These phrases signal you're about to claim without evidence:
- "should work now", "probably", "seems to"
- Expressing satisfaction before running verification
- About to commit/push/PR without checking
- Trusting a delegate's success report without your own verification

In each case: run the command, read the output, then make the claim.
