import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDeviceForUser } from "./device";

const mockGetUserWorkspaceRole = vi.fn();
vi.mock("./workspace", () => ({
  getUserWorkspaceRole: (...args: unknown[]) =>
    mockGetUserWorkspaceRole(...args),
}));

const mockGenerateMqttCredentials = vi.fn();
const mockHashMqttPassword = vi.fn();
vi.mock("./mqtt-auth", () => ({
  generateMqttCredentials: () => mockGenerateMqttCredentials(),
  hashMqttPassword: (pw: string) => mockHashMqttPassword(pw),
}));

vi.mock("node:crypto", () => ({
  randomUUID: () => "generated-device-uuid",
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
  const generatedCredentials = {
    username: "dev_abc123",
    password: "random-base64url-password",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserWorkspaceRole.mockResolvedValue("admin");
    mockGenerateMqttCredentials.mockReturnValue(generatedCredentials);
    mockHashMqttPassword.mockResolvedValue("$2a$10$hashedpassword");
    mockDeviceCreate.mockResolvedValue({
      id: "device-id-1",
      deviceUuid: "generated-device-uuid",
      mqttTopic: "twinkletaps/devices/generated-device-uuid",
      mqttUsername: generatedCredentials.username,
    });
  });

  it("creates device with generated credentials and returns password", async () => {
    const result = await registerDeviceForUser(userId, workspaceId, "My Device");

    expect(result).toEqual({
      deviceId: "device-id-1",
      deviceUuid: "generated-device-uuid",
      mqttTopic: "twinkletaps/devices/generated-device-uuid",
      mqttUsername: generatedCredentials.username,
      mqttPassword: generatedCredentials.password,
    });
    expect(mockGenerateMqttCredentials).toHaveBeenCalled();
    expect(mockHashMqttPassword).toHaveBeenCalledWith(generatedCredentials.password);
    expect(mockDeviceCreate).toHaveBeenCalledWith({
      data: {
        workspaceId,
        name: "My Device",
        deviceUuid: "generated-device-uuid",
        mqttTopic: "twinkletaps/devices/generated-device-uuid",
        mqttUsername: generatedCredentials.username,
        mqttPasswordHash: "$2a$10$hashedpassword",
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
    expect(mockGenerateMqttCredentials).not.toHaveBeenCalled();
    expect(mockDeviceCreate).not.toHaveBeenCalled();
  });

  it("throws when name is empty after trim", async () => {
    await expect(
      registerDeviceForUser(userId, workspaceId, "   "),
    ).rejects.toThrow("Device name must be between 1 and 100 characters");
    expect(mockGenerateMqttCredentials).not.toHaveBeenCalled();
  });

  it("throws when name exceeds 100 characters", async () => {
    await expect(
      registerDeviceForUser(userId, workspaceId, "a".repeat(101)),
    ).rejects.toThrow("Device name must be between 1 and 100 characters");
    expect(mockGenerateMqttCredentials).not.toHaveBeenCalled();
  });
});
