import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { registerDeviceForUser } from "../src/lib/services/device";

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("device registration (integration)", () => {
  let profileId: string;
  let workspaceId: string;
  let mqttCredentialId: string;
  let supabaseAdmin: ReturnType<typeof createClient>;
  let authUserId: string;

  beforeAll(async () => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const email = `int-test-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const password = "test-password-strong-enough";
    const {
      data: { user },
      error: signUpError,
    } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (signUpError || !user) {
      throw new Error(
        `Failed to create test user: ${signUpError?.message ?? "no user"}`,
      );
    }
    authUserId = user.id;

    const membership = await prisma.userWorkspace.findFirst({
      where: { userId: authUserId },
      include: { workspace: true },
    });
    if (!membership) {
      throw new Error("Trigger did not create workspace for test user");
    }
    profileId = authUserId;
    workspaceId = membership.workspaceId;

    const cred = await prisma.mqttCredential.create({
      data: {
        username: `mqtt-int-${crypto.randomUUID().slice(0, 8)}`,
        password: "test-password",
        allocatedUuid: crypto.randomUUID(),
      },
    });
    mqttCredentialId = cred.id;
  }, 15000);

  afterEach(async () => {
    await prisma.device.deleteMany({ where: { workspaceId } });
  });

  afterAll(async () => {
    await prisma.userWorkspace.deleteMany({
      where: { userId: profileId, workspaceId },
    });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await prisma.mqttCredential.delete({ where: { id: mqttCredentialId } });
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
  }, 10000);

  it("creates device with claimed credential and returns credentials", async () => {
    const result = await registerDeviceForUser(
      profileId,
      workspaceId,
      "Integration Test Device",
    );

    expect(result.deviceId).toBeDefined();
    expect(result.deviceUuid).toBeDefined();
    expect(result.mqttTopic).toBe(`twinkletaps/devices/${result.deviceUuid}`);
    expect(result.mqttUsername).toBeDefined();
    expect(result.mqttPassword).toBeDefined();

    const device = await prisma.device.findUnique({
      where: { id: result.deviceId },
    });
    expect(device).not.toBeNull();
    expect(device!.workspaceId).toBe(workspaceId);
    expect(device!.name).toBe("Integration Test Device");
    expect(device!.deviceUuid).toBe(result.deviceUuid);
    expect(device!.mqttTopic).toBe(result.mqttTopic);
    expect(device!.mqttUsername).toBe(result.mqttUsername);

    const credential = await prisma.mqttCredential.findFirst({
      where: { username: result.mqttUsername },
    });
    expect(credential).not.toBeNull();
    expect(credential!.claimedAt).not.toBeNull();
  });
});
