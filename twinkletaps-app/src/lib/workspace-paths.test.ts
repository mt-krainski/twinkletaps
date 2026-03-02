import { describe, expect, it } from "vitest";
import { workspacePath, devicePath } from "./workspace-paths";

describe("workspace navigation paths", () => {
  it("devicePath produces /w/{workspaceId}/d/{deviceId}", () => {
    expect(devicePath("ws-1", "dev-1")).toBe("/w/ws-1/d/dev-1");
  });

  it("workspacePath produces /w/{workspaceId}", () => {
    expect(workspacePath("ws-2")).toBe("/w/ws-2");
  });
});
