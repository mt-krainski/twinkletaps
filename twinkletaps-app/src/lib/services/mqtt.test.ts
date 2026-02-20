import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import mqtt from "mqtt";
import { publishToDevice } from "./mqtt";

vi.mock("mqtt", () => ({
  default: {
    connect: vi.fn(),
  },
}));

vi.mock("../config", () => ({
  config: {
    mqttPublisher: {
      brokerUrl: "mqtts://broker.test:8883",
      username: "pub-user",
      password: "pub-pass",
    },
  },
}));

describe("publishToDevice", () => {
  const mockConnect = vi.mocked(mqtt.connect);

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockImplementation(() => {
      let connectCallback: () => void;
      const client = {
        on: vi.fn((ev: string, fn: () => void) => {
          if (ev === "connect") connectCallback = fn;
          if (ev === "error") return client;
          return client;
        }),
        removeAllListeners: vi.fn(),
        get connected() {
          return true;
        },
        end: vi.fn(),
        publish: vi.fn(
          (_topic: string, _payload: string, _opts: unknown, cb?: (err?: Error) => void) => {
            setImmediate(() => (cb ?? (() => {}))());
          },
        ),
      };
      setImmediate(() => connectCallback?.());
      return client as unknown as ReturnType<typeof mockConnect>;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects with broker URL and publisher credentials and publishes JSON with QoS 1", async () => {
    const publishPromise = publishToDevice("twinkletaps/devices/abc", {
      sequence: "010",
    });

    await vi.waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        "mqtts://broker.test:8883",
        expect.objectContaining({
          username: "pub-user",
          password: "pub-pass",
          connectTimeout: 5000,
        }),
      );
    });

    const client = mockConnect.mock.results[0].value;
    await vi.waitFor(() => {
      expect(client.publish).toHaveBeenCalledWith(
        "twinkletaps/devices/abc",
        '{"sequence":"010"}',
        { qos: 1 },
        expect.any(Function),
      );
    });
    await expect(publishPromise).resolves.toBeUndefined();
  });

  it("rejects with timeout error when connect never fires within 10s", async () => {
    vi.useFakeTimers();
    mockConnect.mockImplementation(() => {
      const client = {
        on: vi.fn(() => client),
        removeAllListeners: vi.fn(),
        get connected() {
          return false;
        },
        end: vi.fn(),
        publish: vi.fn(),
      };
      return client as unknown as ReturnType<typeof mockConnect>;
    });

    const result = expect(
      publishToDevice("topic", { sequence: "1" }),
    ).rejects.toThrow("MQTT publish timed out after 10s");
    await vi.advanceTimersByTimeAsync(10_001);
    await result;
  });

  it("rejects when publish callback receives an error", async () => {
    mockConnect.mockImplementation(() => {
      let connectCallback: () => void;
      const client = {
        on: vi.fn((ev: string, fn: () => void) => {
          if (ev === "connect") connectCallback = fn;
          return client;
        }),
        removeAllListeners: vi.fn(),
        get connected() {
          return true;
        },
        end: vi.fn(),
        publish: vi.fn((_t: string, _p: string, _o: unknown, cb?: (err?: Error) => void) => {
          setImmediate(() => cb?.(new Error("Publish failed")));
        }),
      };
      setImmediate(() => connectCallback?.());
      return client as unknown as ReturnType<typeof mockConnect>;
    });

    await expect(
      publishToDevice("topic", { sequence: "1" }),
    ).rejects.toThrow("Publish failed");
  });
});
