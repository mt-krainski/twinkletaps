import { prisma } from "../prisma";

export type WorkspaceRole = "admin" | "editor" | "viewer";

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

