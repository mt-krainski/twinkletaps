"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";

export interface WorkspaceInfo {
  id: string;
  name: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  isPrivate: boolean;
}

interface WorkspaceContextType {
  workspaces: WorkspaceInfo[];
  selectedWorkspaceId: string | undefined;
  teams: TeamInfo[];
  switchWorkspace: (workspaceId: string) => void;
  navigateToTeam: (teamId: string) => void;
  navigateHome: () => void;
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
  teams: TeamInfo[];
  children: React.ReactNode;
}

export function WorkspaceProvider({
  workspaces,
  selectedWorkspaceId,
  teams,
  children,
}: WorkspaceProviderProps) {
  const router = useRouter();

  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      router.push(`/?workspace=${workspaceId}`);
    },
    [router]
  );

  const navigateToTeam = useCallback(
    (teamId: string) => {
      router.push(`/teams/${teamId}`);
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
        teams,
        switchWorkspace,
        navigateToTeam,
        navigateHome,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
