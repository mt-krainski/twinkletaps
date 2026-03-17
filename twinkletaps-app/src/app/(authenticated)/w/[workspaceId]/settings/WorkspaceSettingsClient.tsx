"use client";

import { useRouter } from "next/navigation";
import {
  WorkspaceSettingsView,
  type WorkspaceMember,
} from "@/components/app/WorkspaceSettings";
import {
  updateWorkspaceName,
  changeMemberRole,
  removeMember,
} from "./actions";
import type { WorkspaceRole } from "@/lib/services/workspace";

const validRoles = new Set<string>(["admin", "member", "guest"]);

interface WorkspaceSettingsClientProps {
  workspaceId: string;
  workspaceName: string;
  members: WorkspaceMember[];
  currentUserId: string;
}

export function WorkspaceSettingsClient({
  workspaceId,
  workspaceName,
  members,
  currentUserId,
}: WorkspaceSettingsClientProps) {
  const router = useRouter();

  async function handleUpdateName(name: string) {
    const result = await updateWorkspaceName(workspaceId, name);
    if (result.error) {
      throw new Error(result.error);
    }
    router.refresh();
  }

  async function handleChangeMemberRole(userId: string, role: string) {
    if (!validRoles.has(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    const result = await changeMemberRole(
      workspaceId,
      userId,
      role as WorkspaceRole,
    );
    if (result.error) {
      throw new Error(result.error);
    }
    router.refresh();
  }

  async function handleRemoveMember(userId: string) {
    const result = await removeMember(workspaceId, userId);
    if (result.error) {
      throw new Error(result.error);
    }
    router.refresh();
  }

  return (
    <WorkspaceSettingsView
      workspaceName={workspaceName}
      members={members}
      isAdmin={true}
      onUpdateName={handleUpdateName}
      onChangeMemberRole={handleChangeMemberRole}
      onRemoveMember={handleRemoveMember}
      currentUserId={currentUserId}
    />
  );
}
