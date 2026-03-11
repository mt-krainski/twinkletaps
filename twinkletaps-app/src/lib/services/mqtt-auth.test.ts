import { describe, expect, it } from "vitest";
import {
  generateMqttCredentials,
  hashMqttPassword,
  verifyMqttPassword,
} from "./mqtt-auth";

describe("generateMqttCredentials", () => {
  it("returns username starting with dev_ and a password", () => {
    const creds = generateMqttCredentials();

    expect(creds.username).toMatch(/^dev_[a-z0-9]+$/);
    expect(creds.password).toBeTruthy();
  });

  it("generates a password of sufficient length (32 bytes base64url)", () => {
    const creds = generateMqttCredentials();

    // 32 bytes in base64url = 43 characters
    expect(creds.password.length).toBeGreaterThanOrEqual(40);
  });

  it("generates unique credentials each time", () => {
    const creds1 = generateMqttCredentials();
    const creds2 = generateMqttCredentials();

    expect(creds1.username).not.toBe(creds2.username);
    expect(creds1.password).not.toBe(creds2.password);
  });
});

describe("hashMqttPassword / verifyMqttPassword", () => {
  it("hashes and verifies a password correctly", async () => {
    const password = "test-password-123";
    const hash = await hashMqttPassword(password);

    expect(hash).not.toBe(password);
    expect(await verifyMqttPassword(password, hash)).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const hash = await hashMqttPassword("correct-password");

    expect(await verifyMqttPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a bcrypt hash", async () => {
    const hash = await hashMqttPassword("test");

    expect(hash).toMatch(/^\$2[aby]?\$/);
  });
});
