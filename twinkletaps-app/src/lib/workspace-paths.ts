export function workspacePath(workspaceId: string): string {
  return `/w/${workspaceId}`;
}

export function devicePath(workspaceId: string, deviceId: string): string {
  return `/w/${workspaceId}/d/${deviceId}`;
}

export function workspaceSettingsPath(workspaceId: string): string {
  return `/w/${workspaceId}/settings`;
}
