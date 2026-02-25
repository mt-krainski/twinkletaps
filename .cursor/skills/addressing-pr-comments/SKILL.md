---
name: addressing-pr-comments
description: Fetch and address GitHub PR review comments one-by-one, replying directly in GitHub threads. Use when the user asks to address PR comments, respond to PR feedback, handle review comments, or work through PR review threads.
---

# Addressing PR Comments

## Prerequisites

Determine the PR number and repo. The user will typically provide the PR number. Derive `{owner}/{repo}` from the git remote:

```bash
git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/'
```

## Step 1: Fetch Comments and Reviews

**Always use the verbatim repo name and PR number in `gh api` paths** (no variables, no subshells). This is required so commands can be allow-listed.

Run these in parallel:

```bash
gh api repos/mt-krainski/twinkletaps/pulls/123/comments
gh api repos/mt-krainski/twinkletaps/pulls/123/reviews
```

Also fetch general PR conversation comments:

```bash
gh api repos/mt-krainski/twinkletaps/issues/123/comments
```

Parse the results. The key fields:

- **Review comments** (inline): `id`, `body`, `path`, `line`, `diff_hunk`, `in_reply_to_id`, `user.login`
- **Reviews**: `id`, `body`, `state` (APPROVED, CHANGES_REQUESTED, COMMENTED), `user.login`
- **Issue comments** (conversation): `id`, `body`, `user.login`

Group inline comments into threads using `in_reply_to_id`. Only address comments from human reviewers — skip bot comments and your own previous replies.

## Step 2: Understand Each Comment

For each comment or thread:

1. Read the comment body and the referenced code (`path`, `line`, `diff_hunk`)
2. Read the actual file in the repo to understand full context
3. Determine what the reviewer is asking for:
   - Code change request
   - Question / clarification
   - Style/convention feedback
   - Architectural concern
   - Nitpick

## Step 3: Evaluate and Respond

**Core principle: The reviewer may be wrong.** Evaluate each comment on technical merit.

For each comment, choose one of:

### A. Agree and implement
The comment is correct. Make the code change, then reply confirming what was done.

### B. Agree and reply only (no code change)
The comment is valid but no code change is needed (e.g. it's a question, or the answer is "yes that's intentional").

### C. Push back
The suggestion is technically wrong, violates repo conventions, introduces unnecessary complexity, or violates good coding principles. Reply with technical reasoning.

**Push back when:**
- Suggestion breaks existing functionality
- Violates YAGNI — adds unused abstractions
- Conflicts with repo patterns/conventions (check `.cursor/rules/`)
- Technically incorrect for this stack
- Would make code harder to maintain
- Violates the Zen of Python or equivalent principles

**How to push back:**
- Cite specific technical reasons
- Reference repo rules or patterns
- Show the concrete downside of the suggestion
- Keep it professional and concise

**If the reviewer insists after pushback:** Yield and implement their way. But if the request violates fundamental coding principles or repo rules, flag it clearly before implementing: "Implementing as requested, but note this violates [principle/rule]."

## Step 4: Reply on GitHub

**Always use verbatim repo name and PR number** — no variables, no subshells. Required for allow-listing.

### Replying to inline review comments (threaded)

```bash
gh api repos/mt-krainski/twinkletaps/pulls/123/comments \
  -X POST \
  -f body="Your reply" \
  -F in_reply_to=456
```

The `in_reply_to` field is the `id` of the root comment in the thread. When this field is set, all other positioning parameters are ignored.

### Replying to general PR conversation

```bash
gh api repos/mt-krainski/twinkletaps/issues/123/comments \
  -X POST \
  -f body="Your reply"
```

### Reply style

- Concise and technical
- No performative gratitude ("Thanks for the feedback!", "Great catch!")
- If code was changed: "Fixed — [brief description of what changed]"
- If pushing back: State the technical reason directly
- If answering a question: Answer directly
- OK to use short replies like "Fixed." or "Done." for simple fixes

## Step 5: Make Code Changes (if any)

After evaluating all comments:

1. Group code changes by file
2. Implement changes
3. Run lint and tests to verify nothing broke
4. Reply to each addressed comment on GitHub (Step 4)

If no code changes are needed (all comments were questions or pushbacks), that's fine — replies only is a valid outcome.

## Step 6: Commit, Push, and Finalize

After all comments are addressed and replies posted:

### If code changes were made

1. Stage only the relevant files (not unrelated changes):
   ```bash
   git add <changed files>
   ```

2. Commit using the repo's git identity:
   ```bash
   GIT_AUTHOR_NAME="$(git config user.name)" \
   GIT_AUTHOR_EMAIL="$(git config user.email)" \
   GIT_COMMITTER_NAME="$(git config user.name)" \
   GIT_COMMITTER_EMAIL="$(git config user.email)" \
   git commit -m "Address PR #${pr_number} review comments

   - <brief bullet per change>"
   ```

   If there is a Jira issue key in context (infer from branch name `task/GFD-###/slug` if needed), prefix with the issue key.

3. Push to the current branch. **Always specify the full branch name verbatim** — no variables, no `HEAD`, no subshells. This is required so the push can be allow-listed to task branches only.
   ```bash
   git push origin task/GFD-123/my-slug
   ```

### If no code changes were made

No commit or push needed. Replies-only is a complete outcome.

## Workflow Summary

```
FOR each comment/thread:
  1. Read comment + referenced code
  2. Evaluate: agree, answer, or push back?
  3. If code change needed: implement it
  4. Reply on GitHub in the correct thread
  5. Move to next comment

AFTER all comments addressed:
  Run lint + tests (if code changed)
  Commit and push (if code changed)
  Report summary to user
```

## Output

After processing all comments, provide a summary:

```
Addressed N comments on PR #X:
- N fixed (code changes)
- N replied only (questions/explanations/pushback)
- N pushed back on

Changes made: [brief list of files changed, if any]
Committed and pushed: yes/no
```
