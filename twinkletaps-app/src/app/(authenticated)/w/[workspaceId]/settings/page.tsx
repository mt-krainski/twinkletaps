import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import {
  getWorkspace,
  getWorkspaceMembers,
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from "@/lib/services/workspace";
import { workspacePath } from "@/lib/workspace-paths";
import { WorkspaceSettingsView } from "@/components/app/WorkspaceSettings";
import {
  updateWorkspaceName,
  changeMemberRole,
  removeMember,
} from "./actions";

interface WorkspaceSettingsPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceSettingsPage({
  params,
}: WorkspaceSettingsPageProps) {
  const user = await getAuthUser();
  const { workspaceId } = await params;

  const workspace = await getWorkspace(user.id, workspaceId);
  if (!workspace || workspace.role !== "admin") {
    redirect(workspacePath(workspaceId));
  }

  const memberships = await getWorkspaceMembers(workspaceId);

  const members = memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.fullName ?? "Unknown",
    username: m.user.username,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    deviceCount: m.user.userDevices.length,
  }));

  async function handleUpdateName(name: string) {
    "use server";
    const result = await updateWorkspaceName(workspaceId, name);
    if (result.error) {
      throw new Error(result.error);
    }
  }

  async function handleChangeMemberRole(userId: string, role: string) {
    "use server";
    if (!WORKSPACE_ROLES.includes(role as WorkspaceRole)) {
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
  }

  async function handleRemoveMember(userId: string) {
    "use server";
    const result = await removeMember(workspaceId, userId);
    if (result.error) {
      throw new Error(result.error);
    }
  }

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Workspace Settings</h1>
      <WorkspaceSettingsView
        workspaceName={workspace.name}
        members={members}
        isAdmin={workspace.role === "admin"}
        onUpdateName={handleUpdateName}
        onChangeMemberRole={handleChangeMemberRole}
        onRemoveMember={handleRemoveMember}
        currentUserId={user.id}
      />
    </div>
  );
}
