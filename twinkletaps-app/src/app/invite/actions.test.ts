import { beforeEach, describe, expect, it, vi } from "vitest";
import { acceptInvitationAction } from "./actions";

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

const mockGetInvitationByToken = vi.fn();
const mockAcceptInvitation = vi.fn();
vi.mock("@/lib/services/invitation", () => ({
  getInvitationByToken: (...args: unknown[]) => mockGetInvitationByToken(...args),
  acceptInvitation: (...args: unknown[]) => mockAcceptInvitation(...args),
}));

describe("acceptInvitationAction", () => {
  const userId = "user-1";
  const token = "invite-token";

  const workspaceInvitation = {
    id: "inv-1",
    type: "workspace" as const,
    workspaceId: "ws-1",
    deviceId: null,
    role: "member",
    workspace: { id: "ws-1", name: "My Workspace" },
    device: null,
    inviter: { fullName: "Alice", username: "alice" },
  };

  const deviceInvitation = {
    id: "inv-2",
    type: "device" as const,
    workspaceId: "ws-1",
    deviceId: "dev-1",
    role: "user",
    workspace: { id: "ws-1", name: "My Workspace" },
    device: { id: "dev-1", name: "My Device" },
    inviter: { fullName: "Alice", username: "alice" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
    mockAcceptInvitation.mockResolvedValue(undefined);
  });

  it("returns workspace redirect for workspace invite", async () => {
    mockGetInvitationByToken.mockResolvedValue(workspaceInvitation);

    const result = await acceptInvitationAction(token);

    expect(mockGetInvitationByToken).toHaveBeenCalledWith(token);
    expect(mockAcceptInvitation).toHaveBeenCalledWith(userId, {
      id: workspaceInvitation.id,
      type: workspaceInvitation.type,
      workspaceId: workspaceInvitation.workspaceId,
      deviceId: workspaceInvitation.deviceId,
      role: workspaceInvitation.role,
    });
    expect(result).toEqual({ redirectTo: "/" });
  });

  it("returns device redirect for device invite", async () => {
    mockGetInvitationByToken.mockResolvedValue(deviceInvitation);

    const result = await acceptInvitationAction(token);

    expect(result).toEqual({ redirectTo: "/devices/dev-1" });
  });

  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(acceptInvitationAction(token)).rejects.toThrow("Not authenticated");
    expect(mockGetInvitationByToken).not.toHaveBeenCalled();
  });

  it("throws when invitation not found or expired", async () => {
    mockGetInvitationByToken.mockResolvedValue(null);

    await expect(acceptInvitationAction(token)).rejects.toThrow(
      "Invitation not found, expired, or already accepted",
    );
    expect(mockAcceptInvitation).not.toHaveBeenCalled();
  });

  it("propagates errors from acceptInvitation", async () => {
    mockGetInvitationByToken.mockResolvedValue(workspaceInvitation);
    mockAcceptInvitation.mockRejectedValue(new Error("Already accepted"));

    await expect(acceptInvitationAction(token)).rejects.toThrow("Already accepted");
  });

  it("throws when invitation has unexpected type", async () => {
    mockGetInvitationByToken.mockResolvedValue({
      ...workspaceInvitation,
      type: "unknown",
    });

    await expect(acceptInvitationAction(token)).rejects.toThrow(
      "Unexpected invitation type: unknown",
    );
    expect(mockAcceptInvitation).not.toHaveBeenCalled();
  });
});
