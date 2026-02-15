import type { ReactNode } from "react";
import { expect, fn, within, waitFor, type UserEventObject } from "storybook/test";
import {
  UserProfileContext,
  type UserProfile,
} from "@/components/user-profile-provider";
import {
  WorkspaceContext,
  type WorkspaceInfo,
  type TeamInfo,
} from "@/components/workspace-provider";

export async function withDropdown(
  triggerElement: HTMLElement,
  userEvent: UserEventObject,
  onOpen: (menuEl: HTMLElement) => Promise<void> | void,
  options?: { role?: string; root?: HTMLElement }
) {
  const role = options?.role ?? "menu";
  const root = options?.root ?? document.body;

  await userEvent.click(triggerElement);

  const menuEl = await within(root).findByRole(role);
  await expect(menuEl).toBeInTheDocument();

  await onOpen(menuEl);

  await waitFor(() => {
    expect(menuEl).not.toBeInTheDocument();
  });
}

export const mockProfile: UserProfile = {
  id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  avatar: "https://github.com/shadcn.png",
};

export const mockWorkspaces: WorkspaceInfo[] = [
  { id: "personal", name: "Personal Workspace" },
  { id: "team-1", name: "Acme Corp" },
  { id: "team-2", name: "Startup Inc" },
];

export const mockTeams: TeamInfo[] = [
  { id: "private-1", name: "My Notes", isPrivate: true },
  { id: "team-a", name: "Engineering", isPrivate: false },
  { id: "team-b", name: "Design", isPrivate: false },
];

type UserProfileValue = React.ComponentProps<
  typeof UserProfileContext.Provider
>["value"];

type WorkspaceValue = React.ComponentProps<
  typeof WorkspaceContext.Provider
>["value"];

interface MockProvidersProps {
  userProfileValue?: Partial<UserProfileValue>;
  workspaceValue?: Partial<WorkspaceValue>;
  children: ReactNode;
}

export function MockProviders({
  userProfileValue,
  workspaceValue,
  children,
}: MockProvidersProps) {
  const userProfile: UserProfileValue = {
    profile: mockProfile,
    isSigningOut: false,
    signOut: fn(),
    navigateToAccount: fn(),
    navigateToSettings: fn(),
    ...userProfileValue,
  };

  const workspace: WorkspaceValue = {
    workspaces: mockWorkspaces,
    selectedWorkspaceId: mockWorkspaces[0]?.id,
    teams: mockTeams,
    switchWorkspace: fn(),
    navigateToTeam: fn(),
    navigateHome: fn(),
    ...workspaceValue,
  };

  return (
    <UserProfileContext.Provider value={userProfile}>
      <WorkspaceContext.Provider value={workspace}>
        {children}
      </WorkspaceContext.Provider>
    </UserProfileContext.Provider>
  );
}
