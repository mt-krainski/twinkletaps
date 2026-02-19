import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDevice } from "./actions";
import { MqttCredentialPoolEmptyError } from "@/lib/services/device";

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

const mockRegisterDeviceForUser = vi.fn();
vi.mock("@/lib/services/device", () => ({
  registerDeviceForUser: (...args: unknown[]) =>
    mockRegisterDeviceForUser(...args),
  MqttCredentialPoolEmptyError: class extends Error {
    readonly name = "MqttCredentialPoolEmptyError";
  },
}));

describe("registerDevice", () => {
  const workspaceId = "ws-1";
  const userId = "user-1";
  const result = {
    deviceId: "device-id-1",
    deviceUuid: "alloc-uuid-1",
    mqttTopic: "twinkletaps/devices/alloc-uuid-1",
    mqttUsername: "mqtt-user",
    mqttPassword: "mqtt-pass",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mockRegisterDeviceForUser.mockResolvedValue(result);
  });

  it("returns result from registerDeviceForUser when authenticated", async () => {
    const out = await registerDevice(workspaceId, "My Device");

    expect(out).toEqual(result);
    expect(mockRegisterDeviceForUser).toHaveBeenCalledWith(
      userId,
      workspaceId,
      "My Device",
    );
  });

  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(registerDevice(workspaceId, "Device")).rejects.toThrow(
      "Not authenticated",
    );
    expect(mockRegisterDeviceForUser).not.toHaveBeenCalled();
  });

  it("propagates MqttCredentialPoolEmptyError from registerDeviceForUser", async () => {
    mockRegisterDeviceForUser.mockRejectedValue(
      new MqttCredentialPoolEmptyError("No unclaimed MQTT credentials in pool"),
    );

    await expect(registerDevice(workspaceId, "Device")).rejects.toThrow(
      MqttCredentialPoolEmptyError,
    );
  });
});
