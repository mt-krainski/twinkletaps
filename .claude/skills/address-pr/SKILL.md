---
name: address-pr
description: "Fetch and address GitHub PR review comments one-by-one, replying directly in GitHub threads. Use when asked to address PR comments, respond to PR feedback, work through review threads, or when receiving any code review feedback. Covers both the evaluation mindset (verify before implementing, push back when wrong) and the GitHub mechanics."
---

# Addressing PR Review Comments

## Core Mindset

Code review requires technical evaluation, not emotional performance. Verify feedback against the codebase before implementing. Push back with technical reasoning when suggestions are wrong. Skip performative agreement — actions over words.

**Forbidden responses:** "You're absolutely right!", "Great point!", "Thanks for catching that!", or any gratitude expression. Instead: restate the technical requirement, fix the issue, or push back.

**If any comment is unclear:** stop — do not implement anything yet. Ask for clarification on all unclear items first, because items may be related and partial understanding leads to wrong implementation.

## Prerequisites

Determine the PR number from the branch name or Jira issue.

**Sync with base branch first:** checkout the PR's base branch (usually `main`), pull latest, then checkout the development branch and merge the base branch in. Resolve any conflicts before addressing review comments.

## Step 1: Fetch Comments and Reviews

```bash
agent-utils gh-pr-fetch <pr-number>
```

Returns combined JSON with keys: `inline_comments`, `reviews`, `conversation`.

Key fields:
- **Review comments** (inline): `id`, `body`, `path`, `line`, `diff_hunk`, `in_reply_to_id`, `user.login`
- **Reviews**: `id`, `body`, `state`, `user.login`
- **Issue comments** (conversation): `id`, `body`, `user.login`

Group inline comments into threads using `in_reply_to_id`. Only address human reviewer comments — skip bot and own replies.

## Step 2: Understand Each Comment

1. Read comment body and referenced code (`path`, `line`, `diff_hunk`)
2. Read actual file in repo for full context
3. Determine type: code change request, question, style feedback, architectural concern, nitpick

## Step 3: Evaluate and Respond

**The reviewer may be wrong.** Evaluate each comment on technical merit before acting.

### Source-specific handling

**From the user:** Trusted — implement after understanding. Still ask if scope is unclear.

**From external reviewers:** Before implementing, check:
1. Technically correct for THIS codebase?
2. Breaks existing functionality?
3. Reason for current implementation?
4. Conflicts with user's prior architectural decisions?

### Response types

**A. Agree and implement** — Comment is correct. Make code change, reply confirming.

**B. Agree and reply only** — Valid but no code change needed (question, intentional design).

**C. Push back** — Technically wrong, violates conventions, unnecessary complexity, or violates YAGNI. Reply with technical reasoning.

Push back when: breaks functionality, violates YAGNI, conflicts with repo patterns, technically incorrect, makes code harder to maintain, reviewer lacks full context.

How: cite technical reasons, reference repo rules, show concrete downside. Keep it professional.

If reviewer insists: yield and implement, but flag if it violates principles.

### Implementation order

For multi-item feedback:
1. Clarify anything unclear FIRST
2. Blocking issues (breaks, security)
3. Simple fixes (typos, imports)
4. Complex fixes (refactoring, logic)
5. Test each fix individually, verify no regressions

## Step 4: Reply on GitHub

**Argument order matters.** Options MUST come before the PR number (Typer quirk with `invoke_without_command=True`).

### Inline review comments (threaded)
```bash
agent-utils gh-pr-reply --body 'Your reply' --comment-id <comment_id> <pr-number>
```

### General PR conversation
```bash
agent-utils gh-pr-reply --body 'Your reply' <pr-number>
```

If you get "Missing option '--body'", check: (1) did you chain with `&&` or `cd`? Split into separate commands. (2) Are quotes correct? Use single quotes for the body.

### Reply style
- Concise and technical
- No performative gratitude
- If code changed: "Fixed — [brief description]" or just "Fixed."
- If pushing back: state technical reason directly
- Short replies like "Fixed." or "Done." are fine

## Step 5: Make Code Changes

1. Group changes by file
2. Implement
3. Reply to each addressed comment on GitHub

## Step 6: Hand Off to /wrap

If code changes were made, invoke `/wrap` to run the full pipeline (lint, test, commit, push, CI watch). Do NOT commit or push directly — `/wrap` handles that.

If no code changes were made (replies-only), this is a valid outcome — no `/wrap` needed.

## Output

```
Addressed N comments on PR #X:
- N fixed (code changes)
- N replied only (questions/explanations/pushback)
- N pushed back on

Changes made: [brief list]
Handing off to /wrap: yes/no
```
