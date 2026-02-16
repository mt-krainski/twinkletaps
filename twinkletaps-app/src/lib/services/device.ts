import { prisma } from "../prisma";
import { getUserWorkspaceRole } from "./workspace";

export type DeviceRole = "user";

export async function getWorkspaceDevices(userId: string, workspaceId: string) {
  const workspaceRole = await getUserWorkspaceRole(userId, workspaceId);
  if (!workspaceRole) {
    return [];
  }

  const allDevicesInWorkspace = await prisma.device.findMany({
    where: {
      workspaceId,
      deletedAt: null,
    },
    include: {
      userDevices: {
        where: { userId, deletedAt: null },
        select: { role: true },
      },
    },
  });

  const isAdminOrMember =
    workspaceRole === "admin" || workspaceRole === "member";
  if (isAdminOrMember) {
    return allDevicesInWorkspace;
  }

  const VALID_DEVICE_ROLES: DeviceRole[] = ["user"];
  // Guest: only devices where this user has a user_devices entry with a valid role
  const devicesUserHasAccessTo = allDevicesInWorkspace.filter((device) =>
    device.userDevices.some((userDevice) =>
      VALID_DEVICE_ROLES.includes(userDevice.role as DeviceRole),
    ),
  );
  return devicesUserHasAccessTo;
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
  deviceId: string,
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
