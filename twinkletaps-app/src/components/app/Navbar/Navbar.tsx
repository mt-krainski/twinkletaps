"use client";

import { useUserProfile } from "@/components/providers/user-profile-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { NavbarView } from "./NavbarView";

export interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const {
    profile,
    isSigningOut,
    signOut,
    navigateToAccount,
    navigateToSettings,
  } = useUserProfile();
  const { workspaces, selectedWorkspaceId, switchWorkspace } = useWorkspace();

  const selectedWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) || workspaces[0];

  return (
    <NavbarView
      className={className}
      profile={profile}
      workspaces={workspaces}
      selectedWorkspace={selectedWorkspace}
      switchWorkspace={switchWorkspace}
      isSigningOut={isSigningOut}
      signOut={signOut}
      navigateToAccount={navigateToAccount}
      navigateToSettings={navigateToSettings}
    />
  );
}
