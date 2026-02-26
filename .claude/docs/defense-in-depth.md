# Defense-in-Depth Validation

When you fix a bug caused by invalid data, adding validation at one place feels sufficient. But that single check can be bypassed.

**Core principle:** Validate at EVERY layer data passes through. Make the bug structurally impossible.

## The Four Layers

### Layer 1: Entry Point Validation
Reject obviously invalid input at API boundary.

### Layer 2: Business Logic Validation
Ensure data makes sense for this operation.

### Layer 3: Environment Guards
Prevent dangerous operations in specific contexts (e.g., refuse git init outside temp dir during tests).

### Layer 4: Debug Instrumentation
Capture context for forensics (stack traces, environment variables).

## Applying the Pattern

1. Trace the data flow — where does bad value originate? Where used?
2. Map all checkpoints — every point data passes through
3. Add validation at each layer
4. Test each layer — try to bypass layer 1, verify layer 2 catches it

All four layers are necessary. Different layers catch different failure modes.
