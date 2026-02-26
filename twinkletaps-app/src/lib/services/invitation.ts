import { randomBytes } from "node:crypto";
import { prisma } from "../prisma";
import { getUserWorkspaceRole } from "./workspace";
import type { WorkspaceRole } from "./workspace";

const INVITATION_EXPIRY_HOURS = 48;

export type InvitationType = "workspace" | "device";

export type InvitationForAccept = {
  id: string;
  type: InvitationType;
  workspaceId: string;
  deviceId: string | null;
  role: string;
};

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createInvitation(
  inviterId: string,
  workspaceId: string,
  options: {
    type: InvitationType;
    role: string;
    deviceId?: string | null;
  },
) {
  const role = await getUserWorkspaceRole(inviterId, workspaceId);
  if (role !== "admin") {
    throw new Error("Only workspace admins can create invitations");
  }

  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);
  const invitation = await prisma.invitation.create({
    data: {
      type: options.type,
      token: generateToken(),
      inviterId,
      workspaceId,
      deviceId: options.type === "device" ? options.deviceId ?? null : null,
      role: options.role,
      expiresAt,
    },
  });

  return { token: invitation.token, expiresAt: invitation.expiresAt };
}

export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { workspace: true, device: true },
  });

  if (!invitation) return null;
  if (invitation.acceptedAt) return null;
  if (new Date() >= invitation.expiresAt) return null;

  return invitation;
}

export async function acceptInvitation(
  userId: string,
  invitation: InvitationForAccept,
) {
  await prisma.$transaction(async (tx) => {
    const updated = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { acceptedAt: new Date(), acceptedBy: userId },
    });
    if (updated.count === 0) {
      throw new Error("Invitation already accepted or expired");
    }

    if (invitation.type === "workspace") {
      const existing = await tx.userWorkspace.findUnique({
        where: {
          userId_workspaceId: { userId, workspaceId: invitation.workspaceId },
          deletedAt: null,
        },
      });
      if (existing) {
        if ((existing.role as WorkspaceRole) === "guest") {
          await tx.userWorkspace.updateMany({
            where: { userId, workspaceId: invitation.workspaceId },
            data: { role: invitation.role as WorkspaceRole },
          });
        }
      } else {
        await tx.userWorkspace.create({
          data: {
            userId,
            workspaceId: invitation.workspaceId,
            role: invitation.role as WorkspaceRole,
          },
        });
      }
    }

    if (invitation.type === "device" && invitation.deviceId) {
      const existing = await tx.userDevice.findUnique({
        where: {
          userId_deviceId: { userId, deviceId: invitation.deviceId },
          deletedAt: null,
        },
      });
      if (!existing) {
        await tx.userDevice.create({
          data: {
            userId,
            deviceId: invitation.deviceId,
            role: "user",
          },
        });
      }
    }
  });
}

export async function listWorkspaceInvitations(userId: string, workspaceId: string) {
  const role = await getUserWorkspaceRole(userId, workspaceId);
  if (role !== "admin") {
    throw new Error("Only workspace admins can list invitations");
  }

  return prisma.invitation.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}
