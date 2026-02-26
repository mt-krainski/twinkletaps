---
name: debug
description: "Systematic debugging procedure. Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes. Always find root cause before attempting fixes."
---

# Systematic Debugging

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## The Four Phases

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully** — don't skip. Stack traces, line numbers, error codes.
2. **Reproduce Consistently** — exact steps, every time? If not reproducible, gather more data.
3. **Check Recent Changes** — git diff, recent commits, config changes, environment differences.
4. **Gather Evidence in Multi-Component Systems** — add diagnostic instrumentation at each component boundary. Run once, analyze where it breaks.
5. **Trace Data Flow** — where does the bad value originate? Keep tracing up the call chain until you find the source. Fix at source, not symptom. (See `.claude/docs/root-cause-tracing.md`)

### Phase 2: Pattern Analysis

1. **Find Working Examples** — similar working code in the same codebase
2. **Compare Against References** — read reference implementations COMPLETELY
3. **Identify Differences** — list every difference, don't assume "that can't matter"
4. **Understand Dependencies** — components, settings, config, environment

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis** — "I think X is the root cause because Y"
2. **Test Minimally** — smallest possible change, one variable at a time
3. **Verify** — worked? -> Phase 4. Didn't? -> new hypothesis. Don't stack fixes.

### Phase 4: Implementation

1. **Create Failing Test Case** — use `/tdd` for proper failing tests
2. **Implement Single Fix** — address root cause. ONE change. No "while I'm here" improvements.
3. **Verify Fix** — test passes? No regressions?
4. **If Fix Doesn't Work** — if < 3 attempts: return to Phase 1. **If ≥ 3: STOP and question architecture.** Discuss with user before attempting more.

## Red Flags — STOP and Follow Process

If you catch yourself thinking:
- "Quick fix for now, investigate later"
- "Just try changing X and see"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (after 2+ tries)
- Each fix reveals new problem in different place

**ALL mean: STOP. Return to Phase 1.**

## Supporting Documentation

- `.claude/docs/root-cause-tracing.md` — trace backward through call chain
- `.claude/docs/defense-in-depth.md` — validation at every layer
- `.claude/docs/condition-based-waiting.md` — replace timeouts with condition polling
