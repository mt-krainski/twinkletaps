import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  updateWorkspaceName,
  changeMemberRole,
  removeMember,
} from "./actions";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: () => mockGetUser(),
      },
    }),
  ),
}));

const mockUpdateWorkspace = vi.fn();
const mockUpdateWorkspaceMemberRole = vi.fn();
const mockRemoveWorkspaceMember = vi.fn();
vi.mock("@/lib/services/workspace", () => ({
  updateWorkspace: (...args: unknown[]) => mockUpdateWorkspace(...args),
  updateWorkspaceMemberRole: (...args: unknown[]) =>
    mockUpdateWorkspaceMemberRole(...args),
  removeWorkspaceMember: (...args: unknown[]) =>
    mockRemoveWorkspaceMember(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateWorkspaceName", () => {
  const userId = "user-1";
  const workspaceId = "ws-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mockUpdateWorkspace.mockResolvedValue({ id: workspaceId, name: "New Name" });
  });

  it("calls updateWorkspace and returns success", async () => {
    const result = await updateWorkspaceName(workspaceId, "New Name");

    expect(result).toEqual({ success: true });
    expect(mockUpdateWorkspace).toHaveBeenCalledWith(userId, workspaceId, {
      name: "New Name",
    });
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateWorkspaceName(workspaceId, "New Name");

    expect(result).toEqual({ error: "Not authenticated" });
    expect(mockUpdateWorkspace).not.toHaveBeenCalled();
  });

  it("returns error when updateWorkspace throws", async () => {
    mockUpdateWorkspace.mockRejectedValue(
      new Error("Only admins can update workspace settings"),
    );

    const result = await updateWorkspaceName(workspaceId, "New Name");

    expect(result).toEqual({
      error: "Only admins can update workspace settings",
    });
  });
});

describe("changeMemberRole", () => {
  const userId = "user-1";
  const workspaceId = "ws-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mockUpdateWorkspaceMemberRole.mockResolvedValue({});
  });

  it("calls updateWorkspaceMemberRole and returns success", async () => {
    const result = await changeMemberRole(workspaceId, "user-2", "admin");

    expect(result).toEqual({ success: true });
    expect(mockUpdateWorkspaceMemberRole).toHaveBeenCalledWith(
      userId,
      workspaceId,
      "user-2",
      "admin",
    );
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await changeMemberRole(workspaceId, "user-2", "admin");

    expect(result).toEqual({ error: "Not authenticated" });
    expect(mockUpdateWorkspaceMemberRole).not.toHaveBeenCalled();
  });

  it("returns error when service throws", async () => {
    mockUpdateWorkspaceMemberRole.mockRejectedValue(
      new Error("Only admins can manage members"),
    );

    const result = await changeMemberRole(workspaceId, "user-2", "admin");

    expect(result).toEqual({ error: "Only admins can manage members" });
  });
});

describe("removeMember", () => {
  const userId = "user-1";
  const workspaceId = "ws-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mockRemoveWorkspaceMember.mockResolvedValue({});
  });

  it("calls removeWorkspaceMember and returns success", async () => {
    const result = await removeMember(workspaceId, "user-2");

    expect(result).toEqual({ success: true });
    expect(mockRemoveWorkspaceMember).toHaveBeenCalledWith(
      userId,
      workspaceId,
      "user-2",
    );
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await removeMember(workspaceId, "user-2");

    expect(result).toEqual({ error: "Not authenticated" });
    expect(mockRemoveWorkspaceMember).not.toHaveBeenCalled();
  });

  it("returns error when service throws", async () => {
    mockRemoveWorkspaceMember.mockRejectedValue(
      new Error("Cannot remove the last admin"),
    );

    const result = await removeMember(workspaceId, "user-2");

    expect(result).toEqual({ error: "Cannot remove the last admin" });
  });
});
