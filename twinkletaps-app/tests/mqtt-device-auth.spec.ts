import { test, expect } from "@playwright/test";
import mqtt, { type MqttClient } from "mqtt";
import { login } from "../src/test-utils/playwright";

const BROKER_URL = process.env.MQTT_BROKER_URL ?? "mqtt://localhost:1883";

test.describe("MQTT authenticated flow", () => {
  test.describe.configure({ retries: 2 });

  test("register device, tap button, receive MQTT message", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Sidebar is inaccessible on mobile");

    const runId = crypto.randomUUID();
    const email = `mqtt-e2e-${runId}@test.com`;
    const deviceName = `MQTT E2E Device ${runId.slice(0, 8)}`;

    // ── 1. Login ──────────────────────────────────────────────────────
    await page.goto("/", { waitUntil: "networkidle" });
    await login(page, email);
    await expect(page).toHaveURL(/\/w\/[^/]+$/, { timeout: 15000 });

    // ── 2. Register device via sidebar ────────────────────────────────
    await expect(
      page.getByRole("button", { name: "Register Device" }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Register Device" }).click();

    await page.getByRole("textbox", { name: "Device name" }).fill(deviceName);
    await page.getByRole("button", { name: "Register" }).click();

    // ── 3. Extract MQTT credentials from the dialog ───────────────────
    await expect(page.getByText("Device registered")).toBeVisible({
      timeout: 10000,
    });

    const dialog = page.getByRole("dialog");

    // Each CredentialRow renders: <Label> + <code>{value}</code> + <CopyButton aria-label="Copy {label}">
    // Use the CopyButton aria-label to anchor to the correct row, then extract <code> text
    const getCredential = async (label: string) => {
      const row = dialog
        .locator("div")
        .filter({ has: page.getByRole("button", { name: `Copy ${label}` }) });
      return row.locator("code").textContent({ timeout: 5000 });
    };

    const topicValue = await getCredential("Topic");
    const usernameValue = await getCredential("Username");
    const passwordValue = await getCredential("Password");

    expect(topicValue).toBeTruthy();
    expect(usernameValue).toBeTruthy();
    expect(passwordValue).toBeTruthy();

    // Dismiss credentials dialog
    await page.getByRole("button", { name: "Done" }).click();

    // ── 4. Connect MQTT subscriber with device credentials ────────────
    let subscriber: MqttClient | undefined;
    let messageTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      subscriber = await new Promise<MqttClient>((resolve, reject) => {
        const client = mqtt.connect(BROKER_URL, {
          username: usernameValue!,
          password: passwordValue!,
          connectTimeout: 10_000,
        });
        client.on("connect", () => resolve(client));
        client.on("error", reject);
      });

      // Subscribe to the device topic
      await new Promise<void>((resolve, reject) => {
        subscriber!.subscribe(topicValue!, { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set up message receiver before tapping
      const receivedPromise = new Promise<{ topic: string; payload: string }>(
        (resolve, reject) => {
          messageTimeout = setTimeout(
            () => reject(new Error("No MQTT message received within 15s")),
            15_000,
          );
          const onMessage = (t: string, p: Buffer) => {
            if (t === topicValue) {
              clearTimeout(messageTimeout);
              messageTimeout = undefined;
              subscriber!.off("message", onMessage);
              resolve({ topic: t, payload: p.toString() });
            }
          };
          subscriber!.on("message", onMessage);
        },
      );

      // ── 5. Navigate to device and tap the button ──────────────────
      const deviceCard = page
        .getByRole("main")
        .getByRole("button", { name: deviceName });
      await expect(deviceCard).toBeVisible({ timeout: 10000 });
      await deviceCard.click();

      await expect(page).toHaveURL(/\/w\/[^/]+\/d\/[^/]+$/, {
        timeout: 10000,
      });
      await expect(
        page.getByRole("heading", { name: deviceName }),
      ).toBeVisible({ timeout: 10000 });

      // Simulate tap pattern: press-release-press-release to get at least one 1->0 transition
      // TapRecorder uses 250ms intervals for 12 steps = 3000ms total
      const tapButton = page.getByRole("button", {
        name: "Record tap sequence",
      });
      await expect(tapButton).toBeVisible({ timeout: 5000 });

      // Hover to position mouse over button
      await tapButton.hover();

      // Pattern: hold 500ms, release 500ms, hold 500ms, release until 12 steps complete
      await page.mouse.down();
      await page.waitForTimeout(500);
      await page.mouse.up();
      await page.waitForTimeout(500);
      await page.mouse.down();
      await page.waitForTimeout(500);
      await page.mouse.up();

      // Wait for recording to finish (12 steps × 250ms = 3s total, minus what we already consumed)
      // Plus 3s cooldown, then "Sent:" status appears
      await expect(page.getByText(/^Sent: [01]{12}$/)).toBeVisible({
        timeout: 15000,
      });

      // ── 6. Verify MQTT message received ─────────────────────────────
      const msg = await receivedPromise;
      expect(msg.topic).toBe(topicValue);
      const parsed = JSON.parse(msg.payload) as { sequence?: string };
      expect(parsed.sequence).toMatch(/^[01]{12}$/);

      // Verify the tap actually produced at least one press-release transition
      const transitions = (parsed.sequence!.match(/10/g) ?? []).length;
      expect(transitions).toBeGreaterThanOrEqual(1);
    } finally {
      // ── 7. Cleanup ──────────────────────────────────────────────────
      if (messageTimeout) clearTimeout(messageTimeout);
      if (subscriber) subscriber.end(true);
    }
  });

  test("MQTT connection with wrong credentials is rejected", async () => {
    const client = mqtt.connect(BROKER_URL, {
      username: "nonexistent-device",
      password: "wrong-password",
      connectTimeout: 10_000,
      reconnectPeriod: 0,
    });

    try {
      const result = await new Promise<"connected" | "closed" | "error">(
        (resolve) => {
          const timeout = setTimeout(() => resolve("closed"), 10_000);
          client.on("connect", () => {
            clearTimeout(timeout);
            resolve("connected");
          });
          client.on("close", () => {
            clearTimeout(timeout);
            resolve("closed");
          });
          client.on("error", () => {
            clearTimeout(timeout);
            resolve("error");
          });
        },
      );

      expect(result).not.toBe("connected");
    } finally {
      client.end(true);
    }
  });
});
