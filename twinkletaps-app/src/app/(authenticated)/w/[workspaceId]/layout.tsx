import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/providers/auth-provider";
import { UserProfileProvider } from "@/components/providers/user-profile-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import DashboardShell from "@/app/(authenticated)/dashboard-shell";
import { registerDevice } from "@/app/(authenticated)/devices/actions";
import { createClient } from "@/lib/supabase/server";
import {
  getProfileSummary,
  getUserWorkspaces,
  getWorkspaceDevices,
  getUserWorkspaceRole,
} from "@/lib/services";

interface WorkspaceLayoutProps {
  children: ReactNode;
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/auth");
  }

  const { workspaceId } = await params;

  const profile = await getProfileSummary(user.id);
  const userWorkspaces = await getUserWorkspaces(user.id);

  const workspaceList = userWorkspaces.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
  }));

  const matchingWorkspace = workspaceList.find((w) => w.id === workspaceId);
  if (!matchingWorkspace) {
    redirect("/");
  }

  const [devices, workspaceRole] = await Promise.all([
    getWorkspaceDevices(user.id, workspaceId),
    getUserWorkspaceRole(user.id, workspaceId),
  ]);

  const deviceList = devices.map((device) => ({
    id: device.id,
    name: device.name,
    deviceUuid: device.deviceUuid,
  }));

  return (
    <AuthProvider>
      <UserProfileProvider
        profile={{
          id: user.id,
          name: profile?.fullName ?? user.email ?? "",
          email: user.email ?? "",
          avatar: profile?.avatarUrl ?? undefined,
        }}
      >
        <WorkspaceProvider
          workspaces={workspaceList}
          selectedWorkspaceId={workspaceId}
          devices={deviceList}
          workspaceRole={workspaceRole ?? undefined}
          registerDevice={registerDevice}
        >
          <DashboardShell>{children}</DashboardShell>
        </WorkspaceProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
