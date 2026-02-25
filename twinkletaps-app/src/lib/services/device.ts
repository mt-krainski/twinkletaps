import { prisma } from "../prisma";
import { getUserWorkspaceRole } from "./workspace";
import {
  claimMqttCredential,
  MqttCredentialPoolEmptyError,
} from "./mqtt-credentials";

export type DeviceRole = "user";

const NAME_MIN_LENGTH = 1;
const NAME_MAX_LENGTH = 100;
const MQTT_TOPIC_PREFIX = "twinkletaps/devices";

export type RegisterDeviceResult = {
  deviceId: string;
  deviceUuid: string;
  mqttTopic: string;
  mqttUsername: string;
  mqttPassword: string;
};

export async function registerDeviceForUser(
  userId: string,
  workspaceId: string,
  name: string,
): Promise<RegisterDeviceResult> {
  const role = await getUserWorkspaceRole(userId, workspaceId);
  if (role !== "admin") {
    throw new Error("Only workspace admins can register devices");
  }

  const trimmedName = name.trim();
  if (
    trimmedName.length < NAME_MIN_LENGTH ||
    trimmedName.length > NAME_MAX_LENGTH
  ) {
    throw new Error(
      `Device name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
    );
  }

  const credential = await claimMqttCredential();
  const deviceUuid = credential.allocatedUuid;
  const mqttTopic = `${MQTT_TOPIC_PREFIX}/${credential.allocatedUuid}`;

  const device = await prisma.device.create({
    data: {
      workspaceId,
      name: trimmedName,
      deviceUuid,
      mqttTopic,
      mqttUsername: credential.username,
    },
  });

  return {
    deviceId: device.id,
    deviceUuid,
    mqttTopic,
    mqttUsername: credential.username,
    mqttPassword: credential.password,
  };
}

export { MqttCredentialPoolEmptyError };

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
    workspaceRole,
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
