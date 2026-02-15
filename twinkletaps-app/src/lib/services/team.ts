import { prisma } from "../prisma";
import { getUserWorkspaceRole } from "./workspace";

export type TeamRole = "admin" | "editor" | "viewer";

export async function getWorkspaceTeams(userId: string, workspaceId: string) {
  const workspaceRole = await getUserWorkspaceRole(userId, workspaceId);

  if (!workspaceRole) {
    return [];
  }

  const teams = await prisma.team.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    include: {
      userTeams: {
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      },
    },
  });

  // Filter: show public teams + private teams user is a member of
  return teams.filter((team) => !team.isPrivate || team.userTeams.length > 0);
}

export async function getTeam(userId: string, teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId, deletedAt: null },
    include: {
      workspace: true,
      userTeams: {
        where: {
          userId,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      },
    },
  });

  if (!team) {
    return null;
  }

  // Check workspace membership
  const workspaceRole = await getUserWorkspaceRole(userId, team.workspaceId);
  if (!workspaceRole) {
    return null;
  }

  // Private team - must be a member
  if (team.isPrivate && team.userTeams.length === 0) {
    return null;
  }

  return {
    ...team,
    userRole: team.userTeams[0]?.role as TeamRole | undefined,
  };
}

export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  const membership = await prisma.userTeam.findUnique({
    where: {
      userId_teamId: { userId, teamId },
      deletedAt: null,
    },
    select: { role: true },
  });

  return membership?.role as TeamRole | null;
}

export async function updateTeam(
  userId: string,
  teamId: string,
  data: { name?: string; avatarUrl?: string | null; isPrivate?: boolean }
) {
  const role = await getUserTeamRole(userId, teamId);

  if (role !== "admin") {
    throw new Error("Only team admins can update team settings");
  }

  return prisma.team.update({
    where: { id: teamId },
    data,
  });
}

export async function softDeleteTeam(userId: string, teamId: string) {
  const role = await getUserTeamRole(userId, teamId);

  if (role !== "admin") {
    throw new Error("Only team admins can delete teams");
  }

  return prisma.team.update({
    where: { id: teamId },
    data: { deletedAt: new Date() },
  });
}

