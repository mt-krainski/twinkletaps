import { prisma } from "../prisma";
import { getUserWorkspaceRole } from "./workspace";

export type DeviceRole = "user";

export async function getWorkspaceDevices(userId: string, workspaceId: string) {
  const workspaceRole = await getUserWorkspaceRole(userId, workspaceId);

  if (!workspaceRole) {
    return [];
  }

  const devices = await prisma.device.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    include: {
      userDevices: {
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

  if (workspaceRole === "admin" || workspaceRole === "member") {
    return devices;
  }

  return devices.filter((device) => device.userDevices.length > 0);
}

export async function getDevice(userId: string, deviceId: string) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId, deletedAt: null },
    include: {
      workspace: true,
      userDevices: {
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

  if (!device) {
    return null;
  }

  const workspaceRole = await getUserWorkspaceRole(userId, device.workspaceId);
  if (!workspaceRole) {
    return null;
  }

  if (workspaceRole === "guest" && device.userDevices.length === 0) {
    return null;
  }

  return {
    ...device,
    userRole: device.userDevices[0]?.role as DeviceRole | undefined,
  };
}

export async function getUserDeviceRole(
  userId: string,
  deviceId: string
): Promise<DeviceRole | null> {
  const membership = await prisma.userDevice.findUnique({
    where: {
      userId_deviceId: { userId, deviceId },
      deletedAt: null,
    },
    select: { role: true },
  });

  return membership?.role as DeviceRole | null;
}
