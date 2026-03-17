import { describe, expect, it } from "vitest";
import { workspacePath, devicePath, workspaceSettingsPath } from "./workspace-paths";

describe("workspace navigation paths", () => {
  it("devicePath produces /w/{workspaceId}/d/{deviceId}", () => {
    expect(devicePath("ws-1", "dev-1")).toBe("/w/ws-1/d/dev-1");
  });

  it("workspacePath produces /w/{workspaceId}", () => {
    expect(workspacePath("ws-2")).toBe("/w/ws-2");
  });

  it("workspaceSettingsPath produces /w/{workspaceId}/settings", () => {
    expect(workspaceSettingsPath("ws-3")).toBe("/w/ws-3/settings");
  });
});
