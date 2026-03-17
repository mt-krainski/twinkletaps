import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import {
  getWorkspace,
  getWorkspaceMembers,
} from "@/lib/services/workspace";
import { workspacePath } from "@/lib/workspace-paths";
import { WorkspaceSettingsClient } from "./WorkspaceSettingsClient";

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

  return (
    <div className="flex-1 p-6">
      <h1 className="mb-6 text-2xl font-bold">Workspace Settings</h1>
      <WorkspaceSettingsClient
        workspaceId={workspaceId}
        workspaceName={workspace.name}
        members={members}
        currentUserId={user.id}
      />
    </div>
  );
}
