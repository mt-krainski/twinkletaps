import mqtt from "mqtt";
import { config } from "../config";

const PUBLISH_TIMEOUT_MS = 10_000;
const CONNECT_TIMEOUT_MS = 5000;

export async function publishToDevice(
  topic: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { brokerUrl: rawUrl, username, password } = config.mqttPublisher;
  if (!rawUrl || !username || !password) {
    throw new Error(
      "MQTT publisher not configured: set MQTT_BROKER_URL, MQTT_PUBLISHER_USERNAME, MQTT_PUBLISHER_PASSWORD",
    );
  }
  const brokerUrl = /^mqtts?:\/\//i.test(rawUrl) ? rawUrl : `mqtts://${rawUrl}`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("MQTT publish timed out after 10s"));
    }, PUBLISH_TIMEOUT_MS);

    const client = mqtt.connect(brokerUrl, {
      username,
      password,
      connectTimeout: CONNECT_TIMEOUT_MS,
    });

    function cleanup() {
      clearTimeout(timeout);
      client.removeAllListeners();
      if (client.connected) {
        client.end(true);
      }
    }

    client.on("error", (err) => {
      cleanup();
      reject(err);
    });

    client.on("connect", () => {
      const payloadStr = JSON.stringify(payload);
      client.publish(topic, payloadStr, { qos: 1 }, (err) => {
        cleanup();
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}
