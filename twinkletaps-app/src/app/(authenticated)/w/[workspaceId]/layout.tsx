import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import DashboardShell from "@/app/(authenticated)/dashboard-shell";
import { registerDevice } from "@/app/(authenticated)/devices/actions";
import { getAuthUser } from "@/lib/auth";
import {
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
  const user = await getAuthUser();
  const { workspaceId } = await params;

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
    <WorkspaceProvider
      workspaces={workspaceList}
      selectedWorkspaceId={workspaceId}
      devices={deviceList}
      workspaceRole={workspaceRole ?? undefined}
      registerDevice={registerDevice}
    >
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}
