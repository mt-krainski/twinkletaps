"use server";

import { createClient } from "@/lib/supabase/server";
import {
  registerDeviceForUser,
  MqttCredentialPoolEmptyError,
  type RegisterDeviceResult,
} from "@/lib/services/device";

export type { RegisterDeviceResult };

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

export { MqttCredentialPoolEmptyError };
