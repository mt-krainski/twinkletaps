"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { RegisterDeviceDialog } from "@/components/app/RegisterDevice";
import { ShareDialog } from "@/components/app/ShareDialog";
import { generateShareLink } from "@/app/(authenticated)/devices/actions";
import { SidebarView } from "./SidebarView";

export interface AppSidebarProps {
  onSearch?: (query: string) => void;
  searchResults?: import("./SidebarView").SearchResult[];
  className?: string;
  children?: React.ReactNode;
}

export function AppSidebar({
  onSearch,
  searchResults = [],
  className,
  children,
}: AppSidebarProps) {
  const router = useRouter();
  const {
    workspaces,
    devices,
    navigateToDevice,
    navigateHome,
    workspaceRole,
    selectedWorkspaceId,
    registerDevice,
  } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const isAdmin = workspaceRole === "admin";
  const canRegisterDevice = isAdmin && !!selectedWorkspaceId;
  const canInviteToWorkspace = isAdmin && !!selectedWorkspaceId;

  return (
    <>
      <SidebarView
        className={className}
        onSearch={onSearch}
        searchResults={searchResults}
        devices={devices}
        onDeviceClick={navigateToDevice}
        onHomeClick={navigateHome}
        canRegisterDevice={canRegisterDevice}
        onRegisterClick={() => setIsRegisterDialogOpen(true)}
        canInviteToWorkspace={canInviteToWorkspace}
        onInviteClick={() => setIsInviteDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        isSearchModalOpen={isSearchModalOpen}
        onSearchModalOpenChange={setIsSearchModalOpen}
      >
        {children}
      </SidebarView>

      {canRegisterDevice && (
        <RegisterDeviceDialog
          open={isRegisterDialogOpen}
          onOpenChange={setIsRegisterDialogOpen}
          onSubmit={(name) =>
            registerDevice(selectedWorkspaceId!, name)
          }
          onSuccess={() => router.refresh()}
        />
      )}

      {canInviteToWorkspace && (
        <ShareDialog
          type="workspace"
          targetName={
            workspaces.find((w) => w.id === selectedWorkspaceId)?.name ??
            "workspace"
          }
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
          onGenerateLink={() =>
            generateShareLink("workspace", selectedWorkspaceId!)
          }
        />
      )}
    </>
  );
}
