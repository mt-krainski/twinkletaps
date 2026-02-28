import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerDeviceForUser,
  MqttCredentialPoolEmptyError,
} from "./device";

const mockGetUserWorkspaceRole = vi.fn();
vi.mock("./workspace", () => ({
  getUserWorkspaceRole: (...args: unknown[]) =>
    mockGetUserWorkspaceRole(...args),
}));

const mockClaimMqttCredential = vi.fn();
vi.mock("./mqtt-credentials", () => ({
  claimMqttCredential: () => mockClaimMqttCredential(),
  MqttCredentialPoolEmptyError: class extends Error {
    readonly name = "MqttCredentialPoolEmptyError";
  },
}));

const mockDeviceCreate = vi.fn();
vi.mock("../prisma", () => ({
  prisma: {
    device: {
      create: (args: unknown) => mockDeviceCreate(args),
    },
  },
}));

describe("registerDeviceForUser", () => {
  const userId = "user-1";
  const workspaceId = "ws-1";
  const allocatedUuid = "alloc-uuid-1";
  const credential = {
    username: "mqtt-user",
    password: "mqtt-pass",
    allocatedUuid,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserWorkspaceRole.mockResolvedValue("admin");
    mockClaimMqttCredential.mockResolvedValue(credential);
    mockDeviceCreate.mockResolvedValue({
      id: "device-id-1",
      deviceUuid: allocatedUuid,
      mqttTopic: `twinkletaps/devices/${allocatedUuid}`,
      mqttUsername: credential.username,
    });
  });

  it("creates device with correct fields and returns credentials including password", async () => {
    const result = await registerDeviceForUser(userId, workspaceId, "My Device");

    expect(result).toEqual({
      deviceId: "device-id-1",
      deviceUuid: allocatedUuid,
      mqttTopic: `twinkletaps/devices/${allocatedUuid}`,
      mqttUsername: credential.username,
      mqttPassword: credential.password,
    });
    expect(mockDeviceCreate).toHaveBeenCalledWith({
      data: {
        workspaceId,
        name: "My Device",
        deviceUuid: allocatedUuid,
        mqttTopic: `twinkletaps/devices/${allocatedUuid}`,
        mqttUsername: credential.username,
      },
    });
  });

  it("trims device name", async () => {
    await registerDeviceForUser(userId, workspaceId, "  Trimmed  ");

    expect(mockDeviceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Trimmed",
      }),
    });
  });

  it("throws when user is not workspace admin", async () => {
    mockGetUserWorkspaceRole.mockResolvedValue("member");

    await expect(
      registerDeviceForUser(userId, workspaceId, "Device"),
    ).rejects.toThrow("Only workspace admins can register devices");
    expect(mockClaimMqttCredential).not.toHaveBeenCalled();
    expect(mockDeviceCreate).not.toHaveBeenCalled();
  });

  it("throws when name is empty after trim", async () => {
    await expect(
      registerDeviceForUser(userId, workspaceId, "   "),
    ).rejects.toThrow("Device name must be between 1 and 100 characters");
    expect(mockClaimMqttCredential).not.toHaveBeenCalled();
  });

  it("throws when name exceeds 100 characters", async () => {
    await expect(
      registerDeviceForUser(userId, workspaceId, "a".repeat(101)),
    ).rejects.toThrow("Device name must be between 1 and 100 characters");
    expect(mockClaimMqttCredential).not.toHaveBeenCalled();
  });

  it("throws MqttCredentialPoolEmptyError when pool is empty", async () => {
    mockClaimMqttCredential.mockRejectedValue(
      new MqttCredentialPoolEmptyError("No unclaimed MQTT credentials in pool"),
    );

    await expect(
      registerDeviceForUser(userId, workspaceId, "Device"),
    ).rejects.toThrow(MqttCredentialPoolEmptyError);
  });
});
