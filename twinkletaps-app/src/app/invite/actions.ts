"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getInvitationByToken,
  acceptInvitation,
  type InvitationType,
} from "@/lib/services/invitation";

export async function acceptInvitationAction(
  token: string,
): Promise<{ redirectTo: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const invitation = await getInvitationByToken(token);
  if (!invitation) {
    throw new Error("Invitation not found, expired, or already accepted");
  }

  const invitationType = invitation.type as InvitationType;
  if (invitationType !== "workspace" && invitationType !== "device") {
    throw new Error(`Unexpected invitation type: ${invitation.type}`);
  }

  await acceptInvitation(user.id, {
    id: invitation.id,
    type: invitationType,
    workspaceId: invitation.workspaceId,
    deviceId: invitation.deviceId,
    role: invitation.role,
  });

  const redirectTo =
    invitationType === "device" && invitation.deviceId
      ? `/devices/${invitation.deviceId}`
      : "/";

  return { redirectTo };
}
