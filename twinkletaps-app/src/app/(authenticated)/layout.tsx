import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/auth-provider";
import { UserProfileProvider } from "@/components/user-profile-provider";
import { WorkspaceProvider } from "@/components/workspace-provider";
import DashboardShell from "./dashboard-shell";
import { createClient } from "@/lib/supabase/server";
import {
  getProfileSummary,
  getUserWorkspaces,
  getWorkspaceTeams,
} from "@/lib/services";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default async function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/auth");
  }

  const profile = await getProfileSummary(user.id);
  const userWorkspaces = await getUserWorkspaces(user.id);

  const workspaceList = userWorkspaces.map((membership) => ({
    id: membership.workspace.id,
    name: membership.workspace.name,
  }));

  const selectedWorkspaceId = workspaceList[0]?.id;
  const teams = selectedWorkspaceId
    ? await getWorkspaceTeams(user.id, selectedWorkspaceId)
    : [];

  const teamList = teams.map((team) => ({
    id: team.id,
    name: team.name,
    isPrivate: team.isPrivate,
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
          selectedWorkspaceId={selectedWorkspaceId}
          teams={teamList}
        >
          <DashboardShell>{children}</DashboardShell>
        </WorkspaceProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
