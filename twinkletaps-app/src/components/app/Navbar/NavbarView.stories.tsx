import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NavbarView, type NavbarViewProps } from "./NavbarView";
import { expect, fn, within } from "storybook/test";
import { withDropdown } from "@/test-utils/storybook";
import { mockProfile, mockWorkspaces } from "@/test-utils/storybook";
import { SidebarProvider } from "@/components/ui/sidebar";

type NavbarViewStoryArgs = NavbarViewProps & {
  onAccountClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => Promise<void>;
  onWorkspaceChange: (id: string) => void;
};

const meta: Meta<NavbarViewStoryArgs> = {
  title: "Components/Navbar",
  component: NavbarView,
  decorators: [
    (Story) => (
      <SidebarProvider>
        <Story />
      </SidebarProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<NavbarViewStoryArgs>;

const defaultArgs: NavbarViewProps = {
  profile: mockProfile,
  workspaces: mockWorkspaces,
  selectedWorkspace: mockWorkspaces[0],
  switchWorkspace: fn(),
  isSigningOut: false,
  signOut: fn(),
  navigateToAccount: fn(),
  navigateToSettings: fn(),
  onCreateWorkspace: fn(),
};

export const Default: Story = {
  args: defaultArgs,
  render: (args) => (
    <div className="h-16 w-full">
      <NavbarView
        profile={args.profile}
        workspaces={args.workspaces}
        selectedWorkspace={args.selectedWorkspace}
        switchWorkspace={args.switchWorkspace}
        isSigningOut={args.isSigningOut}
        signOut={args.signOut}
        navigateToAccount={args.navigateToAccount}
        navigateToSettings={args.navigateToSettings}
        onCreateWorkspace={args.onCreateWorkspace}
      />
    </div>
  ),
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(mockWorkspaces[0].name)).toBeInTheDocument();
    await expect(canvas.getByText(mockProfile.name)).toBeInTheDocument();

    await withDropdown(
      canvas.getByText(mockWorkspaces[0].name),
      userEvent,
      async (menu) => {
        // Selected workspace should have a checkmark
        const selectedItem = within(menu).getByRole("menuitemcheckbox", {
          name: mockWorkspaces[0].name,
        });
        await expect(selectedItem).toHaveAttribute("data-state", "checked");

        // Non-selected workspace should not be checked
        const otherItem = within(menu).getByRole("menuitemcheckbox", {
          name: mockWorkspaces[1].name,
        });
        await expect(otherItem).toHaveAttribute("data-state", "unchecked");

        await userEvent.click(otherItem);
        await expect(args.switchWorkspace).toHaveBeenCalledWith(
          mockWorkspaces[1].id,
        );
      },
    );

    // "Create workspace" option appears in workspace dropdown
    await withDropdown(
      canvas.getByText(mockWorkspaces[0].name),
      userEvent,
      async (menu) => {
        const createOption = within(menu).getByText("Create workspace");
        await userEvent.click(createOption);
        await expect(args.onCreateWorkspace).toHaveBeenCalled();
      },
    );

    const userButton = canvas.getByText(mockProfile.name);
    await withDropdown(userButton, userEvent, async (menu) => {
      await userEvent.click(within(menu).getByText("Account"));
      await expect(args.navigateToAccount).toHaveBeenCalled();
    });

    await withDropdown(userButton, userEvent, async (menu) => {
      const settingsOption = within(menu).getByText("Settings");
      await userEvent.click(settingsOption);
      await expect(args.navigateToSettings).toHaveBeenCalled();
    });

    await withDropdown(userButton, userEvent, async (menu) => {
      const logoutOption = within(menu).getByText("Log out");
      await userEvent.click(logoutOption);
      await expect(args.signOut).toHaveBeenCalled();
    });
  },
};

export const WithTeamWorkspace: Story = {
  args: {
    ...defaultArgs,
    selectedWorkspace: mockWorkspaces[1],
    switchWorkspace: fn(),
  },
  render: (args) => (
    <div className="h-16 w-full">
      <NavbarView
        profile={args.profile}
        workspaces={args.workspaces}
        selectedWorkspace={args.selectedWorkspace}
        switchWorkspace={args.switchWorkspace}
        isSigningOut={args.isSigningOut}
        signOut={args.signOut}
        navigateToAccount={args.navigateToAccount}
        navigateToSettings={args.navigateToSettings}
        onCreateWorkspace={args.onCreateWorkspace}
      />
    </div>
  ),
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(mockWorkspaces[1].name)).toBeInTheDocument();
    await expect(canvas.getByText(mockProfile.name)).toBeInTheDocument();

    await withDropdown(
      canvas.getByText(mockWorkspaces[1].name),
      userEvent,
      async (menu) => {
        // Selected workspace (team) should be checked
        const selectedItem = within(menu).getByRole("menuitemcheckbox", {
          name: mockWorkspaces[1].name,
        });
        await expect(selectedItem).toHaveAttribute("data-state", "checked");

        // Other workspace should not be checked
        const otherItem = within(menu).getByRole("menuitemcheckbox", {
          name: mockWorkspaces[0].name,
        });
        await expect(otherItem).toHaveAttribute("data-state", "unchecked");

        await userEvent.click(otherItem);
        await expect(args.switchWorkspace).toHaveBeenCalledWith(
          mockWorkspaces[0].id,
        );
      },
    );
  },
};

export const WithoutWorkspaces: Story = {
  args: {
    ...defaultArgs,
    workspaces: [],
    selectedWorkspace: undefined,
  },
  render: (args) => (
    <div className="h-16 w-full">
      <NavbarView
        profile={args.profile}
        workspaces={args.workspaces}
        selectedWorkspace={args.selectedWorkspace}
        switchWorkspace={args.switchWorkspace}
        isSigningOut={args.isSigningOut}
        signOut={args.signOut}
        navigateToAccount={args.navigateToAccount}
        navigateToSettings={args.navigateToSettings}
        onCreateWorkspace={args.onCreateWorkspace}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(mockProfile.name)).toBeInTheDocument();
    await expect(
      canvas.queryByText(mockWorkspaces[0].name),
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId("logo")).toBeInTheDocument();
  },
};

export const MobileViewport: Story = {
  args: defaultArgs,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  render: (args) => (
    <div className="h-16 w-full">
      <NavbarView
        profile={args.profile}
        workspaces={args.workspaces}
        selectedWorkspace={args.selectedWorkspace}
        switchWorkspace={args.switchWorkspace}
        isSigningOut={args.isSigningOut}
        signOut={args.signOut}
        navigateToAccount={args.navigateToAccount}
        navigateToSettings={args.navigateToSettings}
        onCreateWorkspace={args.onCreateWorkspace}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // SidebarTrigger (hamburger) should be in the DOM
    const sidebarTrigger = canvas.getByRole("button", {
      name: "Toggle Sidebar",
    });
    await expect(sidebarTrigger).toBeInTheDocument();

    // Logo should still be present
    await expect(canvas.getByTestId("logo")).toBeInTheDocument();
  },
};
