import { prisma } from "../prisma";

export type WorkspaceRole = "admin" | "member" | "guest";

export async function getUserWorkspaces(userId: string) {
  return prisma.userWorkspace.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function getWorkspace(userId: string, workspaceId: string) {
  const membership = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
      deletedAt: null,
    },
    include: {
      workspace: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    ...membership.workspace,
    role: membership.role as WorkspaceRole,
  };
}

export async function getUserWorkspaceRole(
  userId: string,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const membership = await prisma.userWorkspace.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
      deletedAt: null,
    },
    select: { role: true },
  });

  return membership?.role as WorkspaceRole | null;
}

export async function updateWorkspace(
  userId: string,
  workspaceId: string,
  data: { name?: string; avatarUrl?: string | null }
) {
  const role = await getUserWorkspaceRole(userId, workspaceId);

  if (role !== "admin") {
    throw new Error("Only admins can update workspace settings");
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });
}

export async function softDeleteWorkspace(userId: string, workspaceId: string) {
  const role = await getUserWorkspaceRole(userId, workspaceId);

  if (role !== "admin") {
    throw new Error("Only admins can delete workspaces");
  }

  return prisma.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: new Date() },
  });
}

export async function getWorkspaceMembers(workspaceId: string) {
  return prisma.userWorkspace.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          userDevices: {
            where: {
              deletedAt: null,
              device: {
                workspaceId,
                deletedAt: null,
              },
            },
            select: {
              device: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function updateWorkspaceMemberRole(
  adminUserId: string,
  workspaceId: string,
  targetUserId: string,
  newRole: WorkspaceRole,
) {
  const role = await getUserWorkspaceRole(adminUserId, workspaceId);

  if (role !== "admin") {
    throw new Error("Only admins can manage members");
  }

  // Check if target is the last admin
  const admins = await prisma.userWorkspace.findMany({
    where: {
      workspaceId,
      role: "admin",
      deletedAt: null,
    },
    select: { userId: true },
  });

  const adminCount = admins.length;
  const targetIsAdmin = admins.some((a) => a.userId === targetUserId);

  if (targetIsAdmin && adminCount === 1) {
    throw new Error("Cannot demote the last admin");
  }

  return prisma.userWorkspace.updateMany({
    where: {
      userId: targetUserId,
      workspaceId,
      deletedAt: null,
    },
    data: { role: newRole },
  });
}

export async function removeWorkspaceMember(
  adminUserId: string,
  workspaceId: string,
  targetUserId: string,
) {
  const role = await getUserWorkspaceRole(adminUserId, workspaceId);

  if (role !== "admin") {
    throw new Error("Only admins can manage members");
  }

  // Check if target is the last admin
  const admins = await prisma.userWorkspace.findMany({
    where: {
      workspaceId,
      role: "admin",
      deletedAt: null,
    },
    select: { userId: true },
  });

  if (admins.length === 1 && admins[0].userId === targetUserId) {
    throw new Error("Cannot remove the last admin");
  }

  // Soft-delete membership and device access
  return prisma.$transaction(async (tx) => {
    // Soft-delete membership
    await tx.userWorkspace.updateMany({
      where: {
        userId: targetUserId,
        workspaceId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    // Get device IDs in this workspace
    const devices = await tx.device.findMany({
      where: { workspaceId, deletedAt: null },
      select: { id: true },
    });

    const deviceIds = devices.map((d) => d.id);

    // Soft-delete user device access for those devices
    if (deviceIds.length > 0) {
      await tx.userDevice.updateMany({
        where: {
          userId: targetUserId,
          deviceId: { in: deviceIds },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    }
  });
}

