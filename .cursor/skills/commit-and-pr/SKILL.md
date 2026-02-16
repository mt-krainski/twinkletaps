---
name: commit-and-pr
description: Stages relevant changes, creates one commit with repo git identity, pushes branch, and opens a PR with gh. Use when the user asks to commit and create a PR, push and create PR, or similar.
---

# Commit and open PR

When the user asks to commit and create a pull request:

## 1. Stage only the work

Stage only files that belong to the change. Exclude unrelated files (e.g. `.cursor/rules/*` unless they are part of the change).

## 2. Create one informative commit

Use the repo's git identity so the commit is attributed to the user and CI runs correctly:

```bash
GIT_AUTHOR_NAME="$(git config user.name)" GIT_AUTHOR_EMAIL="$(git config user.email)" GIT_COMMITTER_NAME="$(git config user.name)" GIT_COMMITTER_EMAIL="$(git config user.email)" git commit -m "..."
```

**Message format:** Short title (no task ID), then a short body with what changed (bullets or short paragraphs).

**Example:**

```
Update app code — Team → Device

- Prisma: Team/UserTeam → Device/UserDevice; add deviceUuid, mqttTopic, mqttUsername; remove isPrivate
- Services: team.ts → device.ts (getWorkspaceDevices, getDevice, getUserDeviceRole); workspace roles → admin|member|guest
- WorkspaceProvider: DeviceInfo, devices, navigateToDevice, workspaceRole
- Sidebar: Devices section, Lightbulb; stories updated. Layout and test utils aligned.
```

## 3. Push the branch

```bash
git push -u origin <current-branch>
```

## 4. Open PR with gh

**No Cursor attribution** — no mention of Cursor, Cursor Agent, or Cursor branding/links in title or body.

```bash
gh pr create --base <target-branch> --title "<same as commit title>" --body "<body>"
```

- **Target branch:** Usually the branch this was branched from (e.g. `main`, `implement-nextjs-app`). Ask if unclear.
- **PR body:** Task ID, "What changed" (brief bullets), "How to test", "Depends on" if relevant. Nothing else.

Execute this command from outside of the sandbox.

## 5. Return the PR URL

Return the PR URL from `gh pr create` output to the user.
