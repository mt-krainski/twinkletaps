"use server";

import { createClient } from "@/lib/supabase/server";
import {
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  type WorkspaceRole,
} from "@/lib/services/workspace";
import { updateGuestDeviceAccess } from "@/lib/services/device";
import { revokeInvitation } from "@/lib/services/invitation";
import { revalidatePath } from "next/cache";

export async function changeMemberRole(
  workspaceId: string,
  targetUserId: string,
  newRole: WorkspaceRole,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    await updateWorkspaceMemberRole(user.id, workspaceId, targetUserId, newRole);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to change member role:", error);
    return { error: error instanceof Error ? error.message : "Failed to change member role" };
  }
}

export async function removeMember(
  workspaceId: string,
  targetUserId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    await removeWorkspaceMember(user.id, workspaceId, targetUserId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { error: error instanceof Error ? error.message : "Failed to remove member" };
  }
}

export async function setGuestDeviceAccess(
  workspaceId: string,
  targetUserId: string,
  deviceIds: string[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    await updateGuestDeviceAccess(user.id, workspaceId, targetUserId, deviceIds);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to set guest device access:", error);
    return { error: error instanceof Error ? error.message : "Failed to set guest device access" };
  }
}

export async function revokeInvite(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    await revokeInvitation(user.id, invitationId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to revoke invitation:", error);
    return { error: error instanceof Error ? error.message : "Failed to revoke invitation" };
  }
}
