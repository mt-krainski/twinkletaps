import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { MQTT_TOPIC_PREFIX } from "@/lib/services/device";
import { verifyMqttPassword } from "@/lib/services/mqtt-auth";

export async function POST(request: Request) {
  const { secret, publisherUsername, publisherPassword } = config.mqttAuth;
  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let username: string, password: string;
  try {
    ({ username, password } = await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Publisher user gets publish access to all device topics
  if (publisherUsername && username === publisherUsername) {
    if (password === publisherPassword) {
      return NextResponse.json({
        authenticated: true,
        allowedTopics: [`${MQTT_TOPIC_PREFIX}/#`],
      });
    }
    return NextResponse.json({ authenticated: false });
  }

  // Device authentication
  const device = await prisma.device.findFirst({
    where: { mqttUsername: username, deletedAt: null },
  });

  if (!device || !device.mqttPasswordHash) {
    return NextResponse.json({ authenticated: false });
  }

  const isValid = await verifyMqttPassword(password, device.mqttPasswordHash);
  if (!isValid) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    allowedTopics: [device.mqttTopic],
  });
}
