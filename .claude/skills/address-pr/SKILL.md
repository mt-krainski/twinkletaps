---
name: address-pr
description: "Fetch and address GitHub PR review comments one-by-one, replying directly in GitHub threads. Use when asked to address PR comments, respond to PR feedback, or work through review threads."
---

# Addressing PR Comments

## Prerequisites

Determine the PR number. It can be found from the branch name or Jira issue.

## Step 1: Fetch Comments and Reviews

```bash
poe -C agent-utils gh-pr-fetch <pr-number>
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

**Core principle: The reviewer may be wrong.** Evaluate each on technical merit.

### A. Agree and implement
Comment is correct. Make code change, reply confirming.

### B. Agree and reply only
Valid but no code change needed (question, intentional design).

### C. Push back
Technically wrong, violates conventions, unnecessary complexity, or violates YAGNI. Reply with technical reasoning.

**Push back when:** breaks functionality, violates YAGNI, conflicts with repo patterns, technically incorrect, makes code harder to maintain.

**How:** Cite technical reasons, reference repo rules, show concrete downside. Keep it professional.

**If reviewer insists:** Yield and implement, but flag if it violates principles.

## Step 4: Reply on GitHub

### Inline review comments (threaded)
```bash
poe -C agent-utils gh-pr-reply <pr-number> --body "Your reply" --comment-id <comment_id>
```

### General PR conversation
```bash
poe -C agent-utils gh-pr-reply <pr-number> --body "Your reply"
```

### Reply style
- Concise and technical
- No performative gratitude
- If code changed: "Fixed — [brief description]"
- If pushing back: state technical reason directly
- Short replies like "Fixed." or "Done." are fine

## Step 5: Make Code Changes

1. Group changes by file
2. Implement
3. Run lint and tests
4. Reply to each addressed comment on GitHub

## Step 6: Commit, Push, and Finalize

If code changes were made:

1. Stage relevant files
2. `poe -C agent-utils git-commit -m "<ISSUE_KEY>: Address PR #N review comments"`
3. `poe -C agent-utils git-push`

If no code changes: replies-only is a valid outcome.

## Output

```
Addressed N comments on PR #X:
- N fixed (code changes)
- N replied only (questions/explanations/pushback)
- N pushed back on

Changes made: [brief list]
Committed and pushed: yes/no
```
