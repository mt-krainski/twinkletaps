"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserProfile } from "@/components/providers/user-profile-provider";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { CreateWorkspaceDialog } from "@/components/app/CreateWorkspaceDialog";
import { createWorkspaceAction } from "@/app/(authenticated)/workspace-actions";
import { workspacePath } from "@/lib/workspace-paths";
import { NavbarView } from "./NavbarView";

export interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const router = useRouter();
  const {
    profile,
    isSigningOut,
    signOut,
    navigateToAccount,
    navigateToSettings,
  } = useUserProfile();
  const { workspaces, selectedWorkspaceId, switchWorkspace } = useWorkspace();
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedWorkspace =
    workspaces.find((w) => w.id === selectedWorkspaceId) || workspaces[0];

  const handleCreateWorkspace = async (name: string) => {
    const result = await createWorkspaceAction(name);
    if ("error" in result) {
      throw new Error(result.error);
    }
    router.push(workspacePath(result.workspaceId));
    router.refresh();
  };

  return (
    <>
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
        onCreateWorkspace={() => setDialogOpen(true)}
      />
      <CreateWorkspaceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateWorkspace}
      />
    </>
  );
}
