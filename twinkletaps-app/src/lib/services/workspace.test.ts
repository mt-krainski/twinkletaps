import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWorkspace,
  getWorkspaceMembers,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
} from "./workspace";

// getUserWorkspaceRole uses findUnique; other fns use findMany, updateMany
const mockUserWorkspaceFindUnique = vi.fn();
const mockUserWorkspaceFindMany = vi.fn();
const mockUserWorkspaceUpdateMany = vi.fn();
const mockUserWorkspaceCreate = vi.fn();
const mockWorkspaceCreate = vi.fn();
const mockDeviceFindMany = vi.fn();
const mockUserDeviceUpdateMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../prisma", () => ({
  prisma: {
    workspace: {
      create: (args: unknown) => mockWorkspaceCreate(args),
    },
    userWorkspace: {
      findUnique: (args: unknown) => mockUserWorkspaceFindUnique(args),
      findMany: (args: unknown) => mockUserWorkspaceFindMany(args),
      updateMany: (args: unknown) => mockUserWorkspaceUpdateMany(args),
      create: (args: unknown) => mockUserWorkspaceCreate(args),
    },
    device: {
      findMany: (args: unknown) => mockDeviceFindMany(args),
    },
    userDevice: {
      updateMany: (args: unknown) => mockUserDeviceUpdateMany(args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

describe("createWorkspace", () => {
  const userId = "user-1";
  const workspaceName = "My Workspace";
  const createdWorkspace = {
    id: "ws-new",
    name: workspaceName,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          workspace: { create: mockWorkspaceCreate },
          userWorkspace: { create: mockUserWorkspaceCreate },
        };
        return fn(tx);
      },
    );
  });

  it("creates workspace and admin membership in a transaction", async () => {
    mockWorkspaceCreate.mockResolvedValue(createdWorkspace);
    mockUserWorkspaceCreate.mockResolvedValue({});

    const result = await createWorkspace(userId, workspaceName);

    expect(result).toEqual(createdWorkspace);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockWorkspaceCreate).toHaveBeenCalledWith({
      data: { name: workspaceName },
    });
    expect(mockUserWorkspaceCreate).toHaveBeenCalledWith({
      data: {
        userId,
        workspaceId: createdWorkspace.id,
        role: "admin",
      },
    });
  });

  it("propagates error when workspace creation fails", async () => {
    mockWorkspaceCreate.mockRejectedValue(new Error("DB error"));

    await expect(createWorkspace(userId, workspaceName)).rejects.toThrow("DB error");
    expect(mockUserWorkspaceCreate).not.toHaveBeenCalled();
  });
});

describe("getWorkspaceMembers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns members with profile and role", async () => {
    const members = [
      {
        userId: "u1",
        role: "admin",
        user: { id: "u1", fullName: "Alice", avatarUrl: null, username: "alice" },
        userDevices: [],
      },
      {
        userId: "u2",
        role: "member",
        user: { id: "u2", fullName: "Bob", avatarUrl: null, username: "bob" },
        userDevices: [],
      },
    ];
    mockUserWorkspaceFindMany.mockResolvedValue(members);

    const result = await getWorkspaceMembers("ws-1");
    expect(result).toEqual(members);
    expect(mockUserWorkspaceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws-1", deletedAt: null },
      }),
    );
  });

  it("includes device info for guests", async () => {
    const members = [
      {
        userId: "u3",
        role: "guest",
        user: { id: "u3", fullName: "Guest", avatarUrl: null, username: "guest" },
        userDevices: [{ device: { id: "dev-1", name: "Lamp" } }],
      },
    ];
    mockUserWorkspaceFindMany.mockResolvedValue(members);

    const result = await getWorkspaceMembers("ws-1");
    expect(result[0].userDevices).toHaveLength(1);
    expect(result[0].userDevices[0].device.name).toBe("Lamp");
  });
});

describe("updateWorkspaceMemberRole", () => {
  const adminId = "admin-1";
  const wsId = "ws-1";
  const targetId = "user-2";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates role when caller is admin and not last admin", async () => {
    // getUserWorkspaceRole(adminId, wsId) → "admin"
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "admin" });
    // count of remaining admins (excluding target) > 0
    mockUserWorkspaceFindMany.mockResolvedValue([
      { userId: adminId, role: "admin" },
      { userId: "other-admin", role: "admin" },
    ]);
    mockUserWorkspaceUpdateMany.mockResolvedValue({ count: 1 });

    await updateWorkspaceMemberRole(adminId, wsId, targetId, "member");

    expect(mockUserWorkspaceUpdateMany).toHaveBeenCalledWith({
      where: { userId: targetId, workspaceId: wsId, deletedAt: null },
      data: { role: "member" },
    });
  });

  it("throws when caller is not admin", async () => {
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "member" });

    await expect(
      updateWorkspaceMemberRole(adminId, wsId, targetId, "member"),
    ).rejects.toThrow("Only admins can manage members");
    expect(mockUserWorkspaceUpdateMany).not.toHaveBeenCalled();
  });

  it("throws when demoting the last admin", async () => {
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "admin" });
    // Only the target is an admin
    mockUserWorkspaceFindMany.mockResolvedValue([{ userId: targetId, role: "admin" }]);

    await expect(
      updateWorkspaceMemberRole(adminId, wsId, targetId, "member"),
    ).rejects.toThrow("Cannot demote the last admin");
    expect(mockUserWorkspaceUpdateMany).not.toHaveBeenCalled();
  });
});

describe("removeWorkspaceMember", () => {
  const adminId = "admin-1";
  const wsId = "ws-1";
  const targetId = "user-2";

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          userWorkspace: { updateMany: mockUserWorkspaceUpdateMany },
          device: { findMany: mockDeviceFindMany },
          userDevice: { updateMany: mockUserDeviceUpdateMany },
        };
        return fn(tx);
      },
    );
  });

  it("soft-deletes membership and device access", async () => {
    // getUserWorkspaceRole(adminId, wsId) → "admin"
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "admin" });
    // Two admins, so removing target is ok
    mockUserWorkspaceFindMany.mockResolvedValue([
      { userId: adminId, role: "admin" },
      { userId: "other-admin", role: "admin" },
    ]);
    mockDeviceFindMany.mockResolvedValue([{ id: "dev-1" }, { id: "dev-2" }]);
    mockUserWorkspaceUpdateMany.mockResolvedValue({ count: 1 });
    mockUserDeviceUpdateMany.mockResolvedValue({ count: 1 });

    await removeWorkspaceMember(adminId, wsId, targetId);

    expect(mockUserWorkspaceUpdateMany).toHaveBeenCalledWith({
      where: { userId: targetId, workspaceId: wsId, deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockUserDeviceUpdateMany).toHaveBeenCalledWith({
      where: {
        userId: targetId,
        deviceId: { in: ["dev-1", "dev-2"] },
        deletedAt: null,
      },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("throws when caller is not admin", async () => {
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "member" });

    await expect(
      removeWorkspaceMember(adminId, wsId, targetId),
    ).rejects.toThrow("Only admins can manage members");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("throws when removing the last admin", async () => {
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "admin" });
    // Only targetId is admin
    mockUserWorkspaceFindMany.mockResolvedValue([{ userId: targetId, role: "admin" }]);

    await expect(
      removeWorkspaceMember(adminId, wsId, targetId),
    ).rejects.toThrow("Cannot remove the last admin");
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
