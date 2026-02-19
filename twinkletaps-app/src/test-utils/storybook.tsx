import type { ReactNode } from "react";
import { expect, fn, within, waitFor, type UserEventObject } from "storybook/test";
import {
  UserProfileContext,
  type UserProfile,
} from "@/components/providers/user-profile-provider";
import {
  WorkspaceContext,
  type WorkspaceInfo,
  type DeviceInfo,
} from "@/components/providers/workspace-provider";

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

export const mockDevices: DeviceInfo[] = [
  { id: "device-1", name: "Living Room" },
  { id: "device-2", name: "Bedroom" },
  { id: "device-3", name: "Office" },
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
    devices: mockDevices,
    workspaceRole: "admin",
    switchWorkspace: fn(),
    navigateToDevice: fn(),
    navigateHome: fn(),
    registerDevice: async () => ({
      deviceId: "storybook-device",
      deviceUuid: "storybook-uuid",
      mqttTopic: "twinkletaps/devices/storybook-uuid",
      mqttUsername: "storybook-mqtt-user",
      mqttPassword: "storybook-password",
    }),
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
