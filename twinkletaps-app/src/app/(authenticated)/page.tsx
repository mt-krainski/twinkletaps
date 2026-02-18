"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHomeCard } from "@/components/DashboardHomeCard/component";
import { RegisterDeviceDialog } from "@/components/RegisterDevice/component";
import { useWorkspace } from "@/components/workspace-provider";

export default function Home() {
  const router = useRouter();
  const {
    devices,
    workspaceRole,
    navigateToDevice,
    registerDevice,
    selectedWorkspaceId,
  } = useWorkspace();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const isAdmin = workspaceRole === "admin";

  return (
    <>
      <DashboardHomeCard
        devices={devices}
        onDeviceClick={navigateToDevice}
        emptyState={isAdmin ? "register" : "no-access"}
        onRegisterClick={() => setIsRegisterOpen(true)}
      />

      {isAdmin && selectedWorkspaceId && (
        <RegisterDeviceDialog
          open={isRegisterOpen}
          onOpenChange={setIsRegisterOpen}
          onSubmit={(name) => registerDevice(selectedWorkspaceId, name)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}
