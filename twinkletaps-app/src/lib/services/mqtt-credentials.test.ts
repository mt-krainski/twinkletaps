import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimMqttCredential,
  MqttCredentialPoolEmptyError,
} from "./mqtt-credentials";

const mockQueryRaw = vi.fn();
const mockExecuteRaw = vi.fn();
const mockTransaction = vi.fn((fn: (tx: { $queryRaw: typeof mockQueryRaw; $executeRaw: typeof mockExecuteRaw }) => Promise<unknown>) =>
  fn({
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
  }),
);

vi.mock("../prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

describe("mqtt-credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns claimed credential and updates row", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        id: "cred-uuid-1",
        username: "mqtt-user",
        password: "mqtt-pass",
        allocated_uuid: "alloc-uuid-1",
      },
    ]);
    mockExecuteRaw.mockResolvedValueOnce(1);

    const result = await claimMqttCredential();

    expect(result).toEqual({
      username: "mqtt-user",
      password: "mqtt-pass",
      allocatedUuid: "alloc-uuid-1",
    });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
  });

  it("throws MqttCredentialPoolEmptyError when pool is empty", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    await expect(claimMqttCredential()).rejects.toThrow(MqttCredentialPoolEmptyError);
    expect(mockExecuteRaw).not.toHaveBeenCalled();
  });
});
