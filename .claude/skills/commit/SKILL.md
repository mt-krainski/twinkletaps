---
name: commit
description: "Stage relevant changes, create one commit, push branch, and open a PR with gh. Use when asked to commit and create a PR, or as part of the /wrap pipeline."
---

# Commit and Open PR

## 1. Stage Only the Work

Stage only files that belong to the change. Exclude unrelated files.

## 2. Create One Informative Commit

Use `poe git-commit` from `agent-utils` — it sets git author/committer from repo config automatically.

**Always use single quotes** for the `-m` value. Double quotes let the shell interpret backticks, `$`, `<>`, etc. Escape apostrophes as `'\''`.

```bash
poe -C agent-utils git-commit -m '<ISSUE_KEY>: <short title>

- bullet points describing what changed'
```

Infer issue key from branch name `task/GFD-###/slug` if needed. If no issue context, use a descriptive title without a key.

**Example:**

```bash
poe -C agent-utils git-commit -m 'GFD-42: Update app code — Team → Device

- Prisma: Team/UserTeam → Device/UserDevice; add deviceUuid, mqttTopic, mqttUsername; remove isPrivate
- Services: team.ts → device.ts (getWorkspaceDevices, getDevice, getUserDeviceRole)
- WorkspaceProvider: DeviceInfo, devices, navigateToDevice, workspaceRole
- Sidebar: Devices section, Lightbulb; stories updated'
```

## 3. Push the Branch

```bash
poe -C agent-utils git-push
```

`poe git-push` pushes the current branch with `-u origin` and refuses to push `main`/`master` or non-`task/` branches.

## 4. Open PR with gh

**Always use single quotes** for `--title` and `--body`. Escape apostrophes as `'\''`.

```bash
poe -C agent-utils gh-pr-create --base <target-branch> --title '[GFD-###] <Title>' --body '<body>'
```

- **PR title format:** `[GFD-###] <Title>`. If no issue context, descriptive title without brackets.
- **Target branch:** Usually the branch this was branched from (e.g. `main`, `implement-nextjs-app`). Ask if unclear.
- **PR body:** Task ID, "What changed" (brief bullets), "How to test", "Depends on" if relevant.

## 5. Return the PR URL

Return the PR URL from `gh pr create` output to the user.
