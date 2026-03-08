import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDevice, sendTap, generateShareLink } from "./actions";
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
const mockGetDevice = vi.fn();
vi.mock("@/lib/services/device", () => ({
  registerDeviceForUser: (...args: unknown[]) =>
    mockRegisterDeviceForUser(...args),
  getDevice: (...args: unknown[]) => mockGetDevice(...args),
  MqttCredentialPoolEmptyError: class extends Error {
    readonly name = "MqttCredentialPoolEmptyError";
  },
}));

const mockPublishToDevice = vi.fn();
vi.mock("@/lib/services/mqtt", () => ({
  publishToDevice: (...args: unknown[]) => mockPublishToDevice(...args),
}));

const mockCreateInvitation = vi.fn();
vi.mock("@/lib/services/invitation", () => ({
  createInvitation: (...args: unknown[]) => mockCreateInvitation(...args),
}));

const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
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

describe("sendTap", () => {
  const userId = "user-1";
  const deviceId = "device-1";
  const device = {
    id: deviceId,
    mqttTopic: "twinkletaps/devices/uuid-1",
    workspaceId: "ws-1",
    name: "Dev",
    userDevices: [],
    userRole: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: userId } },
    });
    mockGetDevice.mockResolvedValue(device);
    mockPublishToDevice.mockResolvedValue(undefined);
  });

  it("publishes sequence to device topic when authenticated and has access", async () => {
    await sendTap(deviceId, "010");

    expect(mockGetDevice).toHaveBeenCalledWith(userId, deviceId);
    expect(mockPublishToDevice).toHaveBeenCalledWith(
      "twinkletaps/devices/uuid-1",
      { sequence: "010" },
    );
  });

  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(sendTap(deviceId, "1")).rejects.toThrow("Not authenticated");
    expect(mockGetDevice).not.toHaveBeenCalled();
    expect(mockPublishToDevice).not.toHaveBeenCalled();
  });

  it("throws when device not found or access denied", async () => {
    mockGetDevice.mockResolvedValue(null);

    await expect(sendTap(deviceId, "1")).rejects.toThrow(
      "Access denied or device not found",
    );
    expect(mockPublishToDevice).not.toHaveBeenCalled();
  });

  it("throws when sequence is invalid", async () => {
    await expect(sendTap(deviceId, "012")).rejects.toThrow(
      "Invalid sequence: must be a string of 0s and 1s, length 1–12",
    );
    expect(mockPublishToDevice).not.toHaveBeenCalled();
  });

  it("throws when sequence exceeds 12 characters", async () => {
    await expect(sendTap(deviceId, "0101010101010")).rejects.toThrow(
      "Invalid sequence: must be a string of 0s and 1s, length 1–12",
    );
    expect(mockPublishToDevice).not.toHaveBeenCalled();
  });

  it("propagates publishToDevice errors", async () => {
    mockPublishToDevice.mockRejectedValue(new Error("Broker unreachable"));

    await expect(sendTap(deviceId, "1")).rejects.toThrow("Broker unreachable");
  });
});

describe("generateShareLink", () => {
  const userId = "user-1";
  const workspaceId = "ws-1";
  const deviceId = "device-1";
  const token = "abc123token";

  function makeHeaderMap(overrides: Record<string, string> = {}) {
    const map: Record<string, string> = {
      host: "example.com",
      "x-forwarded-proto": "https",
      ...overrides,
    };
    return { get: (key: string) => map[key] ?? null };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
    mockCreateInvitation.mockResolvedValue({ token, expiresAt: new Date() });
    mockHeaders.mockReturnValue(makeHeaderMap());
  });

  it("returns workspace invite URL with token", async () => {
    const url = await generateShareLink("workspace", workspaceId);

    expect(mockCreateInvitation).toHaveBeenCalledWith(userId, workspaceId, {
      type: "workspace",
      role: "member",
      deviceId: undefined,
    });
    expect(url).toBe(`https://example.com/invite/${token}`);
  });

  it("returns device invite URL with token", async () => {
    const url = await generateShareLink("device", workspaceId, deviceId);

    expect(mockCreateInvitation).toHaveBeenCalledWith(userId, workspaceId, {
      type: "device",
      role: "guest",
      deviceId,
    });
    expect(url).toBe(`https://example.com/invite/${token}`);
  });

  it("falls back to http when x-forwarded-proto header is absent", async () => {
    // Simulate localhost where the proxy header is not set
    mockHeaders.mockReturnValue({ get: (key: string) => (key === "host" ? "localhost:3000" : null) });

    const url = await generateShareLink("workspace", workspaceId);

    expect(url).toMatch(/^http:\/\//);
  });

  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(generateShareLink("workspace", workspaceId)).rejects.toThrow(
      "Not authenticated",
    );
    expect(mockCreateInvitation).not.toHaveBeenCalled();
  });
});
