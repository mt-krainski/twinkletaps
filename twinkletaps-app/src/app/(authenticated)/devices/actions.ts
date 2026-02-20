"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getDevice,
  registerDeviceForUser,
  type RegisterDeviceResult,
} from "@/lib/services/device";
import { publishToDevice } from "@/lib/services/mqtt";

const TAP_SEQUENCE_REGEX = /^[01]{1,12}$/;

export async function registerDevice(
  workspaceId: string,
  name: string,
): Promise<RegisterDeviceResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  return registerDeviceForUser(user.id, workspaceId, name);
}

export async function sendTap(
  deviceId: string,
  sequence: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (!TAP_SEQUENCE_REGEX.test(sequence)) {
    throw new Error(
      "Invalid sequence: must be a string of 0s and 1s, length 1–12",
    );
  }

  const device = await getDevice(user.id, deviceId);
  if (!device) {
    throw new Error("Access denied or device not found");
  }

  await publishToDevice(device.mqttTopic, { sequence });
}
