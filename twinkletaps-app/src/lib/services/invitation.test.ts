import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  listWorkspaceInvitations,
  listPendingInvitations,
  revokeInvitation,
} from "./invitation";

const mockGetUserWorkspaceRole = vi.fn();
vi.mock("./workspace", () => ({
  getUserWorkspaceRole: (...args: unknown[]) =>
    mockGetUserWorkspaceRole(...args),
}));

const mockInvitationCreate = vi.fn();
const mockInvitationFindUnique = vi.fn();
const mockInvitationFindMany = vi.fn();
const mockInvitationUpdateMany = vi.fn();
const mockUserWorkspaceCreate = vi.fn();
const mockUserWorkspaceUpdateMany = vi.fn();
const mockUserWorkspaceFindUnique = vi.fn();
const mockUserDeviceCreate = vi.fn();
const mockUserDeviceFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockQueryRaw = vi.fn();

vi.mock("../prisma", () => ({
  prisma: {
    invitation: {
      create: (args: unknown) => mockInvitationCreate(args),
      findUnique: (args: unknown) => mockInvitationFindUnique(args),
      findMany: (args: unknown) => mockInvitationFindMany(args),
      updateMany: (args: unknown) => mockInvitationUpdateMany(args),
    },
    userWorkspace: {
      create: (args: unknown) => mockUserWorkspaceCreate(args),
      updateMany: (args: unknown) => mockUserWorkspaceUpdateMany(args),
      findUnique: (args: unknown) => mockUserWorkspaceFindUnique(args),
    },
    userDevice: {
      create: (args: unknown) => mockUserDeviceCreate(args),
      findUnique: (args: unknown) => mockUserDeviceFindUnique(args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

describe("createInvitation", () => {
  const inviterId = "inviter-1";
  const workspaceId = "ws-1";
  const role = "member";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserWorkspaceRole.mockResolvedValue("admin");
    mockInvitationCreate.mockResolvedValue({
      token: "generated-token",
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
  });

  it("returns token and calls create with workspace type and 48h expiry", async () => {
    const result = await createInvitation(inviterId, workspaceId, {
      type: "workspace",
      role,
    });

    expect(result.token).toBe("generated-token");
    expect(mockInvitationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "workspace",
        inviterId,
        workspaceId,
        role,
        expiresAt: expect.any(Date),
      }),
    });
    const callData = mockInvitationCreate.mock.calls[0][0].data as { expiresAt: Date };
    const expiresAt = callData.expiresAt;
    const now = Date.now();
    const fortyEightHours = 48 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      now + fortyEightHours + 5000,
    );
  });

  it("throws when inviter is not workspace admin", async () => {
    mockGetUserWorkspaceRole.mockResolvedValue("member");

    await expect(
      createInvitation(inviterId, workspaceId, { type: "workspace", role }),
    ).rejects.toThrow("Only workspace admins can create invitations");
    expect(mockInvitationCreate).not.toHaveBeenCalled();
  });
});

describe("getInvitationByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invitation when valid and not expired", async () => {
    const invitation = {
      id: "inv-1",
      type: "workspace" as const,
      token: "valid-token",
      workspaceId: "ws-1",
      deviceId: null,
      role: "member",
      expiresAt: new Date(Date.now() + 3600000),
      acceptedAt: null,
      workspace: { id: "ws-1" },
      device: null,
      inviter: { id: "inviter-1", fullName: "Alice", username: "alice" },
    };
    mockInvitationFindUnique.mockResolvedValue(invitation);

    const result = await getInvitationByToken("valid-token");
    expect(result).toEqual(invitation);
  });

  it("returns null when invitation is expired", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      id: "inv-1",
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
    });

    const result = await getInvitationByToken("expired-token");
    expect(result).toBeNull();
  });

  it("returns null when already accepted", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      id: "inv-1",
      expiresAt: new Date(Date.now() + 3600000),
      acceptedAt: new Date(),
    });

    const result = await getInvitationByToken("used-token");
    expect(result).toBeNull();
  });

  it("returns null when token not found", async () => {
    mockInvitationFindUnique.mockResolvedValue(null);
    const result = await getInvitationByToken("missing");
    expect(result).toBeNull();
  });

  it("returns null when invitation is revoked", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      id: "inv-1",
      expiresAt: new Date(Date.now() + 3600000),
      acceptedAt: null,
      revokedAt: new Date(Date.now() - 1000),
    });

    const result = await getInvitationByToken("revoked-token");
    expect(result).toBeNull();
  });

});

describe("acceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        invitation: { updateMany: mockInvitationUpdateMany },
        userWorkspace: {
          create: mockUserWorkspaceCreate,
          updateMany: mockUserWorkspaceUpdateMany,
          findUnique: mockUserWorkspaceFindUnique,
        },
        userDevice: {
          create: mockUserDeviceCreate,
          findUnique: mockUserDeviceFindUnique,
        },
      };
      return fn(tx);
    });
    mockInvitationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("creates workspace membership for workspace invite", async () => {
    const invitation = {
      id: "inv-1",
      type: "workspace" as const,
      workspaceId: "ws-1",
      deviceId: null,
      role: "member" as const,
    };
    mockUserWorkspaceFindUnique.mockResolvedValue(null);
    mockUserWorkspaceCreate.mockResolvedValue({});

    await acceptInvitation("acceptee-1", invitation);

    expect(mockUserWorkspaceCreate).toHaveBeenCalledWith({
      data: {
        userId: "acceptee-1",
        workspaceId: "ws-1",
        role: "member",
      },
    });
    expect(mockInvitationUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "inv-1",
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: {
        acceptedAt: expect.any(Date),
        acceptedBy: "acceptee-1",
      },
    });
  });

  it("creates device and workspace membership for device invite", async () => {
    const invitation = {
      id: "inv-2",
      type: "device" as const,
      workspaceId: "ws-1",
      deviceId: "dev-1",
      role: "user" as const,
    };
    mockUserWorkspaceFindUnique.mockResolvedValue(null);
    mockUserWorkspaceCreate.mockResolvedValue({});
    mockUserDeviceFindUnique.mockResolvedValue(null);
    mockUserDeviceCreate.mockResolvedValue({});

    await acceptInvitation("acceptee-1", invitation);

    expect(mockUserWorkspaceCreate).toHaveBeenCalledWith({
      data: {
        userId: "acceptee-1",
        workspaceId: "ws-1",
        role: "guest",
      },
    });
    expect(mockUserDeviceCreate).toHaveBeenCalledWith({
      data: {
        userId: "acceptee-1",
        deviceId: "dev-1",
        role: "user",
      },
    });
  });

  it("skips workspace creation for device invite when already a member", async () => {
    const invitation = {
      id: "inv-2",
      type: "device" as const,
      workspaceId: "ws-1",
      deviceId: "dev-1",
      role: "user" as const,
    };
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "member" });
    mockUserDeviceFindUnique.mockResolvedValue(null);
    mockUserDeviceCreate.mockResolvedValue({});

    await acceptInvitation("acceptee-1", invitation);

    expect(mockUserWorkspaceCreate).not.toHaveBeenCalled();
    expect(mockUserDeviceCreate).toHaveBeenCalled();
  });

  it("upgrades existing guest to member when accepting workspace invite", async () => {
    const invitation = {
      id: "inv-1",
      type: "workspace" as const,
      workspaceId: "ws-1",
      deviceId: null,
      role: "member" as const,
    };
    mockUserWorkspaceFindUnique.mockResolvedValue({ role: "guest" });
    mockUserWorkspaceUpdateMany.mockResolvedValue({ count: 1 });

    await acceptInvitation("acceptee-1", invitation);

    expect(mockUserWorkspaceCreate).not.toHaveBeenCalled();
    expect(mockUserWorkspaceUpdateMany).toHaveBeenCalledWith({
      where: { userId: "acceptee-1", workspaceId: "ws-1" },
      data: { role: "member" },
    });
  });

  it("throws when invitation already accepted or expired", async () => {
    mockInvitationUpdateMany.mockResolvedValue({ count: 0 });
    const invitation = {
      id: "inv-1",
      type: "workspace" as const,
      workspaceId: "ws-1",
      deviceId: null,
      role: "member" as const,
    };

    await expect(acceptInvitation("acceptee-1", invitation)).rejects.toThrow(
      "Invitation already accepted or expired",
    );
    expect(mockUserWorkspaceCreate).not.toHaveBeenCalled();
  });
});

describe("listWorkspaceInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserWorkspaceRole.mockResolvedValue("admin");
  });

  it("returns invitations for workspace", async () => {
    const list = [
      {
        id: "inv-1",
        token: "t1",
        type: "workspace",
        role: "member",
        expiresAt: new Date(),
      },
    ];
    mockInvitationFindMany.mockResolvedValue(list);

    const result = await listWorkspaceInvitations("user-1", "ws-1");
    expect(result).toEqual(list);
    expect(mockInvitationFindMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-1",
        acceptedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("throws when user is not admin", async () => {
    mockGetUserWorkspaceRole.mockResolvedValue("member");
    await expect(listWorkspaceInvitations("user-1", "ws-1")).rejects.toThrow(
      "Only workspace admins can list invitations",
    );
    expect(mockInvitationFindMany).not.toHaveBeenCalled();
  });
});

describe("listPendingInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserWorkspaceRole.mockResolvedValue("admin");
  });

  it("returns pending invitations excluding revoked", async () => {
    const invitations = [
      {
        id: "inv-1",
        token: "t1",
        type: "workspace",
        role: "member",
        expiresAt: new Date(Date.now() + 3600000),
        acceptedAt: null,
        revokedAt: null,
        inviter: { id: "inv-id", fullName: "Alice", username: "alice" },
      },
    ];
    mockInvitationFindMany.mockResolvedValue(invitations);

    const result = await listPendingInvitations("admin-1", "ws-1");
    expect(result).toEqual(invitations);
    expect(mockInvitationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId: "ws-1",
          acceptedAt: null,
          expiresAt: { gt: expect.any(Date) },
          revokedAt: null,
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("throws when user is not admin", async () => {
    mockGetUserWorkspaceRole.mockResolvedValue("member");
    await expect(listPendingInvitations("user-1", "ws-1")).rejects.toThrow(
      "Only workspace admins can list invitations",
    );
    expect(mockInvitationFindMany).not.toHaveBeenCalled();
  });
});

describe("revokeInvitation", () => {
  const adminId = "admin-1";
  const invitationId = "inv-1";
  const wsId = "ws-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets revokedAt when caller is admin", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      id: invitationId,
      workspaceId: wsId,
    });
    mockGetUserWorkspaceRole.mockResolvedValue("admin");
    mockInvitationUpdateMany.mockResolvedValue({ count: 1 });

    await revokeInvitation(adminId, invitationId);

    expect(mockInvitationUpdateMany).toHaveBeenCalledWith({
      where: { id: invitationId },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("throws when caller is not admin of the workspace", async () => {
    mockInvitationFindUnique.mockResolvedValue({
      id: invitationId,
      workspaceId: wsId,
    });
    mockGetUserWorkspaceRole.mockResolvedValue("member");

    await expect(revokeInvitation(adminId, invitationId)).rejects.toThrow(
      "Only workspace admins can revoke invitations",
    );
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });

  it("throws when invitation not found", async () => {
    mockInvitationFindUnique.mockResolvedValue(null);

    await expect(revokeInvitation(adminId, invitationId)).rejects.toThrow(
      "Invitation not found",
    );
    expect(mockInvitationUpdateMany).not.toHaveBeenCalled();
  });
});
