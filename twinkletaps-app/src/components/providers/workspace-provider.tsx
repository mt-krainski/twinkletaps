"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceRole } from "@/lib/services/workspace";
import type { RegisterDeviceResult } from "@/lib/services/device";

export interface WorkspaceInfo {
  id: string;
  name: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  deviceUuid?: string;
}

export type RegisterDeviceFn = (
  workspaceId: string,
  name: string,
) => Promise<RegisterDeviceResult>;

interface WorkspaceContextType {
  workspaces: WorkspaceInfo[];
  selectedWorkspaceId: string | undefined;
  devices: DeviceInfo[];
  workspaceRole: WorkspaceRole | undefined;
  switchWorkspace: (workspaceId: string) => void;
  navigateToDevice: (deviceId: string) => void;
  navigateHome: () => void;
  registerDevice: RegisterDeviceFn;
}

export const WorkspaceContext = createContext<
  WorkspaceContextType | undefined
>(undefined);

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

interface WorkspaceProviderProps {
  workspaces: WorkspaceInfo[];
  selectedWorkspaceId?: string;
  devices: DeviceInfo[];
  workspaceRole: WorkspaceRole | undefined;
  registerDevice: RegisterDeviceFn;
  children: React.ReactNode;
}

export function WorkspaceProvider({
  workspaces,
  selectedWorkspaceId,
  devices,
  workspaceRole,
  registerDevice,
  children,
}: WorkspaceProviderProps) {
  const router = useRouter();

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      router.push(`/?workspace=${workspaceId}`);
    },
    [router]
  );

  const navigateToDevice = useCallback(
    (deviceId: string) => {
      router.push(`/devices/${deviceId}`);
    },
    [router]
  );

  const navigateHome = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        selectedWorkspaceId,
        devices,
        workspaceRole,
        switchWorkspace,
        navigateToDevice,
        navigateHome,
        registerDevice,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
