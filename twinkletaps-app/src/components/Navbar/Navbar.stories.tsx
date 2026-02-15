import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Navbar, type NavbarProps } from "./component";
import { expect, fn, within } from "storybook/test";
import {
  MockProviders,
  mockProfile,
  mockWorkspaces,
  withDropdown,
} from "@/test-utils/storybook";

type NavbarStoryArgs = NavbarProps & {
  onAccountClick: () => void;
  onSettingsClick: () => void;
  onLogoutClick: () => Promise<void>;
  onWorkspaceChange: (id: string) => void;
};

const meta: Meta<NavbarStoryArgs> = {
  title: "Components/Navbar",
  component: Navbar,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<NavbarStoryArgs>;

export const Default: Story = {
  args: {
    onAccountClick: fn(),
    onSettingsClick: fn(),
    onLogoutClick: fn(),
    onWorkspaceChange: fn(),
  },
  decorators: [
    (Story, context) => (
      <MockProviders
        userProfileValue={{
          navigateToAccount: context.args.onAccountClick,
          navigateToSettings: context.args.onSettingsClick,
          signOut: context.args.onLogoutClick,
        }}
        workspaceValue={{
          switchWorkspace: context.args.onWorkspaceChange,
        }}
      >
        <div className="h-16 w-full">
          <Story />
        </div>
      </MockProviders>
    ),
  ],
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(mockWorkspaces[0].name)).toBeInTheDocument();
    await expect(canvas.getByText(mockProfile.name)).toBeInTheDocument();

    // Workspace dropdown: switch workspace
    await withDropdown(
      canvas.getByText(mockWorkspaces[0].name),
      userEvent,
      async (menu) => {
        await userEvent.click(within(menu).getByText(mockWorkspaces[1].name));
        await expect(args.onWorkspaceChange).toHaveBeenCalledWith(
          mockWorkspaces[1].id,
        );
      },
    );

    // User menu: test Account click
    const userButton = canvas.getByText(mockProfile.name);
    await withDropdown(userButton, userEvent, async (menu) => {
      await userEvent.click(within(menu).getByText("Account"));
      await expect(args.onAccountClick).toHaveBeenCalled();
    });

    // User menu: test Settings click
    await withDropdown(userButton, userEvent, async (menu) => {
      const settingsOption = within(menu).getByText("Settings");
      await userEvent.click(settingsOption);
      await expect(args.onSettingsClick).toHaveBeenCalled();
    });

    // User menu: test Log out click
    await withDropdown(userButton, userEvent, async (menu) => {
      const logoutOption = within(menu).getByText("Log out");
      await userEvent.click(logoutOption);
      await expect(args.onLogoutClick).toHaveBeenCalled();
    });
  },
};

export const WithTeamWorkspace: Story = {
  args: {
    onWorkspaceChange: fn(),
  },
  decorators: [
    (Story, context) => (
      <MockProviders
        workspaceValue={{
          selectedWorkspaceId: "team-1",
          switchWorkspace: context.args.onWorkspaceChange,
        }}
      >
        <div className="h-16 w-full">
          <Story />
        </div>
      </MockProviders>
    ),
  ],
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(mockWorkspaces[1].name)).toBeInTheDocument();
    await expect(canvas.getByText(mockProfile.name)).toBeInTheDocument();

    await withDropdown(
      canvas.getByText(mockWorkspaces[1].name),
      userEvent,
      async (menu) => {
        await userEvent.click(within(menu).getByText(mockWorkspaces[0].name));
        await expect(args.onWorkspaceChange).toHaveBeenCalledWith(
          mockWorkspaces[0].id,
        );
      },
    );
  },
};

export const WithoutWorkspaces: Story = {
  decorators: [
    (Story) => (
      <MockProviders
        workspaceValue={{ workspaces: [], selectedWorkspaceId: undefined }}
      >
        <div className="h-16 w-full">
          <Story />
        </div>
      </MockProviders>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(mockProfile.name)).toBeInTheDocument();
    await expect(
      canvas.queryByText(mockWorkspaces[0].name),
    ).not.toBeInTheDocument();

    // Logo component should still be visible (check for the company name text)
    await expect(canvas.getByTestId("logo")).toBeInTheDocument();
  },
};
