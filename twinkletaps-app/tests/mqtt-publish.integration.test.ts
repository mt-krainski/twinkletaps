import "dotenv/config";

import mqtt, { type MqttClient } from "mqtt";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/lib/config";
import { prisma } from "../src/lib/prisma";
import { registerDeviceForUser } from "../src/lib/services/device";
import { publishToDevice } from "../src/lib/services/mqtt";

const hasMqtt =
  !!config.mqttPublisher.brokerUrl &&
  !!config.mqttPublisher.username &&
  !!config.mqttPublisher.password;

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfReady = hasMqtt && hasDb ? describe : describe.skip;

describeIfReady("MQTT publish (integration)", () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  let authUserId: string;
  let workspaceId: string;
  let subscriber: MqttClient;
  let deviceTopic: string;

  beforeAll(async () => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const email = `mqtt-pub-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: "test-password-strong-enough",
      email_confirm: true,
    });
    if (error || !user) {
      throw new Error(`Failed to create test user: ${error?.message ?? "no user"}`);
    }
    authUserId = user.id;

    const membership = await prisma.userWorkspace.findFirst({
      where: { userId: authUserId },
      include: { workspace: true },
    });
    if (!membership) throw new Error("Trigger did not create workspace");
    workspaceId = membership.workspaceId;

    const device = await registerDeviceForUser(
      authUserId,
      workspaceId,
      "MQTT Publish Integration Device",
    );
    deviceTopic = device.mqttTopic;

    // Connect subscriber using device credentials (authenticated via auth extension)
    await new Promise<void>((resolve, reject) => {
      subscriber = mqtt.connect(config.mqttPublisher.brokerUrl!, {
        username: device.mqttUsername,
        password: device.mqttPassword,
        connectTimeout: 10_000,
      });
      subscriber.on("connect", () => resolve());
      subscriber.on("error", reject);
    });
  }, 20_000);

  afterAll(async () => {
    if (subscriber) {
      subscriber.end(true);
      await new Promise((r) => subscriber.once("close", r));
    }
    await prisma.device.deleteMany({ where: { workspaceId } });
    await prisma.userWorkspace.deleteMany({
      where: { userId: authUserId, workspaceId },
    });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
  }, 10_000);

  it(
    "sends message via publishToDevice and device subscriber receives it",
    { timeout: 20_000 },
    async () => {
      await new Promise<void>((resolve, reject) => {
        subscriber.subscribe(deviceTopic, { qos: 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const receivedPromise = new Promise<{ topic: string; payload: string }>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("No message received within 10s")),
            10_000,
          );
          const onMessage = (t: string, p: Buffer) => {
            if (t === deviceTopic) {
              clearTimeout(timeout);
              subscriber.off("message", onMessage);
              resolve({ topic: t, payload: p.toString() });
            }
          };
          subscriber.on("message", onMessage);
        },
      );

      await publishToDevice(deviceTopic, { sequence: "010" });

      const msg = await receivedPromise;
      expect(msg.topic).toBe(deviceTopic);
      const parsed = JSON.parse(msg.payload) as { sequence?: string };
      expect(parsed.sequence).toBe("010");
    },
  );
});
