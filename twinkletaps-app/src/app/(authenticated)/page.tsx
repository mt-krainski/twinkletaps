"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHomeCard } from "@/components/app/DashboardHomeCard";
import { RegisterDeviceDialog } from "@/components/app/RegisterDevice";
import { useWorkspace } from "@/components/providers/workspace-provider";

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
