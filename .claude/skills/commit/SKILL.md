---
name: commit
description: "Stage relevant changes, create one commit, and push the branch. Low-level utility — does NOT open PRs or update Jira. Use /wrap for the full pipeline (review, test, commit, PR, Jira, CI watch)."
---

# Commit and Push

Low-level utility: stage, commit, push. That's it.

For the full pipeline (review, lint, test, PR, Jira, CI), use `/wrap` instead.

Naming conventions (branch, commit, PR title) are defined in the `/workflow` skill. Command syntax is in the `/git-and-github` skill.

## 1. Stage Only the Work

Stage only files that belong to the change. Exclude unrelated files.

## 2. Create One Informative Commit

Use `agent-utils git-commit` (see `/git-and-github` for syntax).

**Always use single quotes** for the `-m` value. Double quotes let the shell interpret backticks, `$`, `<>`, etc. Escape apostrophes as `'\''`.

Infer issue key from branch name `task/GFD-###/slug` if needed. If no issue context, use a descriptive title without a key.

**Example:**

```bash
agent-utils git-commit -m 'GFD-42: Update app code — Team → Device

- Prisma: Team/UserTeam → Device/UserDevice; add deviceUuid, mqttTopic, mqttUsername; remove isPrivate
- Services: team.ts → device.ts (getWorkspaceDevices, getDevice, getUserDeviceRole)
- WorkspaceProvider: DeviceInfo, devices, navigateToDevice, workspaceRole
- Sidebar: Devices section, Lightbulb; stories updated'
```

## 3. Push the Branch

```bash
agent-utils git-push
```
