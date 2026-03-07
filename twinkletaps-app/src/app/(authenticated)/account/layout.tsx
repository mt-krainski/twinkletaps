import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import DashboardShell from "@/app/(authenticated)/dashboard-shell";
import { registerDevice } from "@/app/(authenticated)/devices/actions";
import { createClient } from "@/lib/supabase/server";
import {
  getUserWorkspaces,
  getWorkspaceDevices,
  getUserWorkspaceRole,
} from "@/lib/services";

interface AccountLayoutProps {
  children: ReactNode;
}

export default async function AccountLayout({
  children,
}: AccountLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/auth");
  }

  const userWorkspaces = await getUserWorkspaces(user.id);

  const workspaceList = userWorkspaces.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
  }));

  const selectedWorkspaceId = workspaceList[0]?.id;
  const [devices, workspaceRole] = selectedWorkspaceId
    ? await Promise.all([
        getWorkspaceDevices(user.id, selectedWorkspaceId),
        getUserWorkspaceRole(user.id, selectedWorkspaceId),
      ])
    : [[], undefined];

  const deviceList = devices.map((device) => ({
    id: device.id,
    name: device.name,
    deviceUuid: device.deviceUuid,
  }));

  return (
    <WorkspaceProvider
      workspaces={workspaceList}
      selectedWorkspaceId={selectedWorkspaceId}
      devices={deviceList}
      workspaceRole={workspaceRole ?? undefined}
      registerDevice={registerDevice}
    >
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}
