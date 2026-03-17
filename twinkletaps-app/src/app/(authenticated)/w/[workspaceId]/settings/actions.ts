"use server";

import { createClient } from "@/lib/supabase/server";
import {
  updateWorkspace,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  type WorkspaceRole,
} from "@/lib/services/workspace";
import { revalidatePath } from "next/cache";

export async function updateWorkspaceName(
  workspaceId: string,
  name: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    await updateWorkspace(user.id, workspaceId, { name });
    revalidatePath(`/w/${workspaceId}/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to update workspace name:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to update workspace name",
    };
  }
}

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
    await updateWorkspaceMemberRole(
      user.id,
      workspaceId,
      targetUserId,
      newRole,
    );
    revalidatePath(`/w/${workspaceId}/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to change member role:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to change member role",
    };
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
    revalidatePath(`/w/${workspaceId}/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to remove member",
    };
  }
}
