---
name: commit
description: "Stage relevant changes, create one commit, push branch, and open a PR with gh. Use when asked to commit and create a PR, or as part of the /wrap pipeline."
---

# Commit and Open PR

## 1. Stage Only the Work

Stage only files that belong to the change. Exclude unrelated files.

## 2. Create One Informative Commit

Use the repo's git identity so the commit is attributed to the user and CI runs correctly:

```bash
GIT_AUTHOR_NAME="$(git config user.name)" GIT_AUTHOR_EMAIL="$(git config user.email)" GIT_COMMITTER_NAME="$(git config user.name)" GIT_COMMITTER_EMAIL="$(git config user.email)" git commit -m "..."
```

**Message format:** `<ISSUE_KEY>: <short title>`, then a short body with what changed (bullets or short paragraphs). Infer issue key from branch name `task/GFD-###/slug` if needed. If no issue context, use a descriptive title without a key.

**Example:**

```
GFD-42: Update app code — Team → Device

- Prisma: Team/UserTeam → Device/UserDevice; add deviceUuid, mqttTopic, mqttUsername; remove isPrivate
- Services: team.ts → device.ts (getWorkspaceDevices, getDevice, getUserDeviceRole)
- WorkspaceProvider: DeviceInfo, devices, navigateToDevice, workspaceRole
- Sidebar: Devices section, Lightbulb; stories updated
```

## 3. Push the Branch

**Always specify the branch explicitly** — never use a bare `git push`.

```bash
git push -u origin <current-branch>
```

## 4. Open PR with gh

```bash
gh pr create --base <target-branch> --title "[GFD-###] <Title>" --body "<body>"
```

- **PR title format:** `[GFD-###] <Title>`. If no issue context, descriptive title without brackets.
- **Target branch:** Usually the branch this was branched from (e.g. `main`, `implement-nextjs-app`). Ask if unclear.
- **PR body:** Task ID, "What changed" (brief bullets), "How to test", "Depends on" if relevant.

## 5. Return the PR URL

Return the PR URL from `gh pr create` output to the user.
