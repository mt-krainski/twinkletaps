import "dotenv/config";

import mqtt, { type MqttClient } from "mqtt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "../src/lib/config";
import { publishToDevice } from "../src/lib/services/mqtt";

describe("MQTT publish (integration)", () => {
  let subscriber: MqttClient;
  let topic: string;
  const received: { topic: string; payload: Buffer }[] = [];

  beforeAll(async () => {
    const { brokerUrl, username, password } = config.mqttPublisher;
    if (!brokerUrl || !username || !password) {
      throw new Error(
        "MQTT integration test requires MQTT_BROKER_URL, MQTT_PUBLISHER_USERNAME, MQTT_PUBLISHER_PASSWORD in .env",
      );
    }
    const topicEnv = process.env.MQTT_TEST_TOPIC;
    if (!topicEnv) {
      throw new Error("MQTT integration test requires MQTT_TEST_TOPIC in .env");
    }
    topic = topicEnv;

    await new Promise<void>((resolve, reject) => {
      subscriber = mqtt.connect(brokerUrl, {
        username,
        password,
        connectTimeout: 30_000,
      });
      subscriber.on("connect", () => resolve());
      subscriber.on("error", reject);
    });

    subscriber.subscribe(topic, { qos: 1 }, (err) => {
      if (err) throw err;
    });
    subscriber.on("message", (topic, payload) => {
      received.push({ topic, payload });
    });
  }, 35_000);

  afterAll(async () => {
    if (subscriber) {
      subscriber.end(true);
      await new Promise((resolve) => subscriber.once("close", resolve));
    }
  }, 5000);

  it("sends message via publishToDevice and subscriber receives it", { timeout: 35_000 }, async () => {
    const payload = { sequence: "010" };
    received.length = 0;

    const receivedPromise = new Promise<{ topic: string; payload: Buffer }>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("No message received within 30s")),
        30_000,
      );
      const onMessage = (topic: string, payload: Buffer) => {
        clearTimeout(timeout);
        subscriber.off("message", onMessage);
        resolve({ topic, payload });
      };
      subscriber.on("message", onMessage);
    });

    await publishToDevice(topic, payload);

    const msg = await receivedPromise;
    expect(msg.topic).toBe(topic);
    const parsed = JSON.parse(msg.payload.toString()) as { sequence?: string };
    expect(parsed.sequence).toBe("010");
  });
});
