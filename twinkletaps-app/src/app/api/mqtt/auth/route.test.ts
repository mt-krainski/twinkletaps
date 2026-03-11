import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockFindFirst = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    device: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

const mockVerifyMqttPassword = vi.fn();
vi.mock("@/lib/services/mqtt-auth", () => ({
  verifyMqttPassword: (...args: unknown[]) => mockVerifyMqttPassword(...args),
}));

function makeRequest(body: object | string, authHeader?: string) {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  if (authHeader) {
    headers.set("authorization", authHeader);
  }
  return new Request("http://localhost/api/mqtt/auth", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/mqtt/auth", () => {
  const device = {
    id: "device-1",
    deviceUuid: "uuid-1",
    mqttPasswordHash: "$2a$10$hashedpw",
    mqttTopic: "twinkletaps/devices/uuid-1",
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MQTT_AUTH_SECRET = "test-secret";
    process.env.MQTT_PUBLISHER_USERNAME = "publisher_user";
    process.env.MQTT_PUBLISHER_PASSWORD = "publisher_pass";
  });

  it("authenticates a valid device and returns allowed topics", async () => {
    mockFindFirst.mockResolvedValue(device);
    mockVerifyMqttPassword.mockResolvedValue(true);

    const res = await POST(
      makeRequest(
        { username: "dev_abc123", password: "correct-pass" },
        "Bearer test-secret",
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      authenticated: true,
      allowedTopics: ["twinkletaps/devices/uuid-1"],
    });
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { mqttUsername: "dev_abc123", deletedAt: null },
    });
    expect(mockVerifyMqttPassword).toHaveBeenCalledWith(
      "correct-pass",
      "$2a$10$hashedpw",
    );
  });

  it("rejects invalid password", async () => {
    mockFindFirst.mockResolvedValue(device);
    mockVerifyMqttPassword.mockResolvedValue(false);

    const res = await POST(
      makeRequest(
        { username: "dev_abc123", password: "wrong-pass" },
        "Bearer test-secret",
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ authenticated: false });
  });

  it("rejects when device not found", async () => {
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest(
        { username: "dev_unknown", password: "any" },
        "Bearer test-secret",
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ authenticated: false });
  });

  it("rejects when device has no password hash", async () => {
    mockFindFirst.mockResolvedValue({ ...device, mqttPasswordHash: null });

    const res = await POST(
      makeRequest(
        { username: "dev_abc123", password: "any" },
        "Bearer test-secret",
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ authenticated: false });
  });

  it("authenticates publisher user with publish access", async () => {
    const res = await POST(
      makeRequest(
        { username: "publisher_user", password: "publisher_pass" },
        "Bearer test-secret",
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      authenticated: true,
      allowedTopics: ["twinkletaps/devices/#"],
    });
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("rejects publisher user with wrong password", async () => {
    const res = await POST(
      makeRequest(
        { username: "publisher_user", password: "wrong" },
        "Bearer test-secret",
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ authenticated: false });
  });

  it("returns 401 when Bearer token is missing", async () => {
    const res = await POST(
      makeRequest({ username: "dev_abc123", password: "pass" }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 401 when Bearer token is incorrect", async () => {
    const res = await POST(
      makeRequest(
        { username: "dev_abc123", password: "pass" },
        "Bearer wrong-secret",
      ),
    );

    expect(res.status).toBe(401);
  });

  it("returns 500 when MQTT_AUTH_SECRET is not configured", async () => {
    delete process.env.MQTT_AUTH_SECRET;

    const res = await POST(
      makeRequest(
        { username: "dev_abc123", password: "pass" },
        "Bearer anything",
      ),
    );

    expect(res.status).toBe(500);
  });

  it("returns 400 for malformed JSON body", async () => {
    const res = await POST(makeRequest("not-json{", "Bearer test-secret"));

    expect(res.status).toBe(400);
  });

  it("does not match publisher when MQTT_PUBLISHER_USERNAME is unset", async () => {
    delete process.env.MQTT_PUBLISHER_USERNAME;
    mockFindFirst.mockResolvedValue(null);

    const res = await POST(
      makeRequest({ password: "any" }, "Bearer test-secret"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ authenticated: false });
    expect(mockFindFirst).toHaveBeenCalled();
  });
});
