import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import {
  createInvitation,
  getInvitationByToken,
  acceptInvitation,
  listWorkspaceInvitations,
} from "../src/lib/services/invitation";

const hasDb =
  !!process.env.DATABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("invitation service (integration)", () => {
  let supabaseAdmin: ReturnType<typeof createClient>;
  let adminUserId: string;
  let accepteeUserId: string;
  let workspaceId: string;
  let deviceId: string;

  beforeAll(async () => {
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Create admin user (Supabase trigger creates profile + workspace + membership)
    const adminEmail = `int-inv-admin-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const { data: adminData, error: adminError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: "test-password-strong-enough",
        email_confirm: true,
      });
    if (adminError || !adminData.user) {
      throw new Error(`Failed to create admin user: ${adminError?.message ?? "no user"}`);
    }
    adminUserId = adminData.user.id;

    const membership = await prisma.userWorkspace.findFirst({
      where: { userId: adminUserId },
    });
    if (!membership) {
      throw new Error("Trigger did not create workspace for admin user");
    }
    workspaceId = membership.workspaceId;

    // Create acceptee user
    const accepteeEmail = `int-inv-acceptee-${crypto.randomUUID().slice(0, 8)}@example.com`;
    const { data: accepteeData, error: accepteeError } =
      await supabaseAdmin.auth.admin.createUser({
        email: accepteeEmail,
        password: "test-password-strong-enough",
        email_confirm: true,
      });
    if (accepteeError || !accepteeData.user) {
      throw new Error(`Failed to create acceptee user: ${accepteeError?.message ?? "no user"}`);
    }
    accepteeUserId = accepteeData.user.id;

    // Create a device in the workspace for device invite tests
    const device = await prisma.device.create({
      data: {
        workspaceId,
        name: `int-inv-device-${crypto.randomUUID().slice(0, 8)}`,
        deviceUuid: crypto.randomUUID(),
        mqttTopic: `twinkletaps/devices/${crypto.randomUUID()}`,
      },
    });
    deviceId = device.id;
  }, 20000);

  afterEach(async () => {
    // Clean invitations + memberships created by tests (not the admin's own membership)
    await prisma.invitation.deleteMany({ where: { workspaceId } });
    await prisma.userDevice.deleteMany({ where: { userId: accepteeUserId } });
    await prisma.userWorkspace.deleteMany({
      where: { userId: accepteeUserId, workspaceId },
    });
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({ where: { workspaceId } });
    await prisma.userDevice.deleteMany({ where: { deviceId } });
    await prisma.device.deleteMany({ where: { id: deviceId } });
    await prisma.userWorkspace.deleteMany({ where: { workspaceId } });
    await prisma.workspace.delete({ where: { id: workspaceId } });
    await supabaseAdmin.auth.admin.deleteUser(adminUserId);
    await supabaseAdmin.auth.admin.deleteUser(accepteeUserId);
  }, 10000);

  describe("createInvitation", () => {
    it("creates a workspace invitation with token and 48h expiry", async () => {
      const result = await createInvitation(adminUserId, workspaceId, {
        type: "workspace",
        role: "member",
      });

      expect(result.token).toBeDefined();
      expect(result.token.length).toBeGreaterThan(0);

      const diff = result.expiresAt.getTime() - Date.now();
      const fortyEightHours = 48 * 60 * 60 * 1000;
      expect(diff).toBeGreaterThan(fortyEightHours - 5000);
      expect(diff).toBeLessThanOrEqual(fortyEightHours);

      // Verify it's actually in the DB
      const dbInvitation = await prisma.invitation.findFirst({
        where: { token: result.token },
      });
      expect(dbInvitation).not.toBeNull();
      expect(dbInvitation!.type).toBe("workspace");
      expect(dbInvitation!.inviterId).toBe(adminUserId);
      expect(dbInvitation!.workspaceId).toBe(workspaceId);
      expect(dbInvitation!.role).toBe("member");
    });

    it("creates a device invitation linked to a device", async () => {
      const result = await createInvitation(adminUserId, workspaceId, {
        type: "device",
        role: "user",
        deviceId,
      });

      const dbInvitation = await prisma.invitation.findFirst({
        where: { token: result.token },
      });
      expect(dbInvitation!.type).toBe("device");
      expect(dbInvitation!.deviceId).toBe(deviceId);
    });

    it("rejects when inviter is not admin", async () => {
      await expect(
        createInvitation(accepteeUserId, workspaceId, {
          type: "workspace",
          role: "member",
        }),
      ).rejects.toThrow("Only workspace admins can create invitations");
    });
  });

  describe("getInvitationByToken", () => {
    it("returns a valid, non-expired invitation", async () => {
      const { token } = await createInvitation(adminUserId, workspaceId, {
        type: "workspace",
        role: "member",
      });

      const invitation = await getInvitationByToken(token);
      expect(invitation).not.toBeNull();
      expect(invitation!.token).toBe(token);
      expect(invitation!.workspace).toBeDefined();
      expect(invitation!.workspace.id).toBe(workspaceId);
    });

    it("returns null for an expired invitation", async () => {
      // Insert a manually expired invitation
      const token = `expired-${crypto.randomUUID()}`;
      await prisma.invitation.create({
        data: {
          type: "workspace",
          token,
          inviterId: adminUserId,
          workspaceId,
          role: "member",
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const result = await getInvitationByToken(token);
      expect(result).toBeNull();
    });

    it("returns null for an already-accepted invitation", async () => {
      const token = `accepted-${crypto.randomUUID()}`;
      await prisma.invitation.create({
        data: {
          type: "workspace",
          token,
          inviterId: adminUserId,
          workspaceId,
          role: "member",
          expiresAt: new Date(Date.now() + 86400000),
          acceptedAt: new Date(),
          acceptedBy: accepteeUserId,
        },
      });

      const result = await getInvitationByToken(token);
      expect(result).toBeNull();
    });

    it("returns null for a non-existent token", async () => {
      const result = await getInvitationByToken("does-not-exist");
      expect(result).toBeNull();
    });
  });

  describe("acceptInvitation", () => {
    it("creates workspace membership when accepting a workspace invite", async () => {
      const { token } = await createInvitation(adminUserId, workspaceId, {
        type: "workspace",
        role: "member",
      });
      const invitation = await getInvitationByToken(token);

      await acceptInvitation(accepteeUserId, {
        id: invitation!.id,
        type: invitation!.type as "workspace",
        workspaceId: invitation!.workspaceId,
        deviceId: invitation!.deviceId,
        role: invitation!.role,
      });

      // Verify invitation is marked accepted
      const dbInvitation = await prisma.invitation.findUnique({
        where: { id: invitation!.id },
      });
      expect(dbInvitation!.acceptedAt).not.toBeNull();
      expect(dbInvitation!.acceptedBy).toBe(accepteeUserId);

      // Verify membership was created
      const membership = await prisma.userWorkspace.findUnique({
        where: {
          userId_workspaceId: { userId: accepteeUserId, workspaceId },
        },
      });
      expect(membership).not.toBeNull();
      expect(membership!.role).toBe("member");
    });

    it("creates user_device when accepting a device invite", async () => {
      const { token } = await createInvitation(adminUserId, workspaceId, {
        type: "device",
        role: "user",
        deviceId,
      });
      const invitation = await getInvitationByToken(token);

      await acceptInvitation(accepteeUserId, {
        id: invitation!.id,
        type: invitation!.type as "device",
        workspaceId: invitation!.workspaceId,
        deviceId: invitation!.deviceId,
        role: invitation!.role,
      });

      const userDevice = await prisma.userDevice.findUnique({
        where: {
          userId_deviceId: { userId: accepteeUserId, deviceId },
        },
      });
      expect(userDevice).not.toBeNull();
      expect(userDevice!.role).toBe("user");
    });

    it("upgrades existing guest to member on workspace invite accept", async () => {
      // Set up acceptee as guest in the workspace
      await prisma.userWorkspace.create({
        data: { userId: accepteeUserId, workspaceId, role: "guest" },
      });

      const { token } = await createInvitation(adminUserId, workspaceId, {
        type: "workspace",
        role: "member",
      });
      const invitation = await getInvitationByToken(token);

      await acceptInvitation(accepteeUserId, {
        id: invitation!.id,
        type: invitation!.type as "workspace",
        workspaceId: invitation!.workspaceId,
        deviceId: invitation!.deviceId,
        role: invitation!.role,
      });

      const membership = await prisma.userWorkspace.findUnique({
        where: {
          userId_workspaceId: { userId: accepteeUserId, workspaceId },
        },
      });
      expect(membership!.role).toBe("member");
    });

    it("rejects double-accept of the same invitation", async () => {
      const { token } = await createInvitation(adminUserId, workspaceId, {
        type: "workspace",
        role: "member",
      });
      const invitation = await getInvitationByToken(token);
      const invData = {
        id: invitation!.id,
        type: invitation!.type as "workspace",
        workspaceId: invitation!.workspaceId,
        deviceId: invitation!.deviceId,
        role: invitation!.role,
      };

      await acceptInvitation(accepteeUserId, invData);

      await expect(acceptInvitation(accepteeUserId, invData)).rejects.toThrow(
        "Invitation already accepted or expired",
      );
    });
  });

  describe("listWorkspaceInvitations", () => {
    it("returns only pending, non-expired invitations", async () => {
      // Create a valid invitation
      await createInvitation(adminUserId, workspaceId, {
        type: "workspace",
        role: "member",
      });

      // Create an expired invitation directly
      await prisma.invitation.create({
        data: {
          type: "workspace",
          token: `expired-list-${crypto.randomUUID()}`,
          inviterId: adminUserId,
          workspaceId,
          role: "member",
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      // Create an accepted invitation directly
      await prisma.invitation.create({
        data: {
          type: "workspace",
          token: `accepted-list-${crypto.randomUUID()}`,
          inviterId: adminUserId,
          workspaceId,
          role: "member",
          expiresAt: new Date(Date.now() + 86400000),
          acceptedAt: new Date(),
          acceptedBy: accepteeUserId,
        },
      });

      const results = await listWorkspaceInvitations(adminUserId, workspaceId);

      // Only the valid invitation should be returned
      expect(results).toHaveLength(1);
      expect(results[0].acceptedAt).toBeNull();
      expect(results[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("rejects when caller is not admin", async () => {
      await expect(
        listWorkspaceInvitations(accepteeUserId, workspaceId),
      ).rejects.toThrow("Only workspace admins can list invitations");
    });
  });
});
