import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspaceAction } from "./workspace-actions";

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

const mockCreateWorkspace = vi.fn();
vi.mock("@/lib/services/workspace", () => ({
  createWorkspace: (...args: unknown[]) => mockCreateWorkspace(...args),
}));

describe("createWorkspaceAction", () => {
  const userId = "user-1";
  const workspaceId = "ws-new-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mockCreateWorkspace.mockResolvedValue({ id: workspaceId, name: "My Team" });
  });

  it("returns workspaceId on success", async () => {
    const result = await createWorkspaceAction("My Team");

    expect(result).toEqual({ workspaceId });
    expect(mockCreateWorkspace).toHaveBeenCalledWith(userId, "My Team");
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createWorkspaceAction("Test");

    expect(result).toEqual({ error: "Not authenticated" });
    expect(mockCreateWorkspace).not.toHaveBeenCalled();
  });

  it("returns error when createWorkspace throws", async () => {
    mockCreateWorkspace.mockRejectedValue(new Error("DB connection failed"));

    const result = await createWorkspaceAction("Test");

    expect(result).toEqual({ error: "DB connection failed" });
  });
});
