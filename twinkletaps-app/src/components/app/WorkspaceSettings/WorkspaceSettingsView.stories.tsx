import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within, waitFor } from "storybook/test";
import { withDropdown } from "@/test-utils/storybook";
import {
  WorkspaceSettingsView,
  type WorkspaceSettingsViewProps,
  type WorkspaceMember,
} from "./WorkspaceSettingsView";

const mockMembers: WorkspaceMember[] = [
  {
    userId: "user-1",
    name: "Alice Admin",
    username: "alice",
    avatarUrl: null,
    role: "admin",
    deviceCount: 2,
  },
  {
    userId: "user-2",
    name: "Bob Member",
    username: "bob",
    avatarUrl: null,
    role: "member",
    deviceCount: 1,
  },
  {
    userId: "user-3",
    name: "Carol Guest",
    username: null,
    avatarUrl: null,
    role: "guest",
    deviceCount: 0,
  },
];

const defaultArgs: WorkspaceSettingsViewProps = {
  workspaceName: "Acme Corp",
  members: mockMembers,
  isAdmin: true,
  onUpdateName: fn(),
  onChangeMemberRole: fn(),
  onRemoveMember: fn(),
  currentUserId: "user-1",
};

const meta: Meta<typeof WorkspaceSettingsView> = {
  title: "Components/WorkspaceSettings",
  component: WorkspaceSettingsView,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof WorkspaceSettingsView>;

export const AdminView: Story = {
  args: {
    ...defaultArgs,
    onUpdateName: fn(),
    onChangeMemberRole: fn(),
    onRemoveMember: fn(),
  },
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    // Workspace name input should show current name
    const nameInput = canvas.getByLabelText("Workspace Name");
    await expect(nameInput).toHaveValue("Acme Corp");

    // Save button should exist
    await expect(
      canvas.getByRole("button", { name: "Save" }),
    ).toBeInTheDocument();

    // All members should be visible
    await expect(canvas.getByText("Alice Admin")).toBeInTheDocument();
    await expect(canvas.getByText("Bob Member")).toBeInTheDocument();
    await expect(canvas.getByText("Carol Guest")).toBeInTheDocument();

    // Roles should be visible
    await expect(canvas.getByText("admin")).toBeInTheDocument();
    await expect(canvas.getByText("member")).toBeInTheDocument();
    await expect(canvas.getByText("guest")).toBeInTheDocument();

    // Admin should NOT see action button for themselves
    await expect(
      canvas.queryByRole("button", { name: "Actions for Alice Admin" }),
    ).not.toBeInTheDocument();

    // Admin should see action buttons for other members
    await expect(
      canvas.getByRole("button", { name: "Actions for Bob Member" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Actions for Carol Guest" }),
    ).toBeInTheDocument();

    // Save should be disabled when name hasn't changed
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();

    // Type a new name and click Save
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "New Workspace Name");
    await expect(
      canvas.getByRole("button", { name: "Save" }),
    ).not.toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(args.onUpdateName).toHaveBeenCalledWith("New Workspace Name");
    });

    // Test dropdown: change Bob's role to admin
    await withDropdown(
      canvas.getByRole("button", { name: "Actions for Bob Member" }),
      userEvent,
      async (menu) => {
        // Bob is a "member", so "Make member" should be absent
        await expect(
          within(menu).queryByText("Make member"),
        ).not.toBeInTheDocument();

        // "Make admin" and "Make guest" should be present
        await expect(
          within(menu).getByText("Make admin"),
        ).toBeInTheDocument();
        await expect(
          within(menu).getByText("Make guest"),
        ).toBeInTheDocument();

        // Click "Make admin"
        await userEvent.click(within(menu).getByText("Make admin"));
        await expect(args.onChangeMemberRole).toHaveBeenCalledWith(
          "user-2",
          "admin",
        );
      },
    );

    // Test dropdown: remove Carol
    await withDropdown(
      canvas.getByRole("button", { name: "Actions for Carol Guest" }),
      userEvent,
      async (menu) => {
        await userEvent.click(within(menu).getByText("Remove"));
        await expect(args.onRemoveMember).toHaveBeenCalledWith("user-3");
      },
    );
  },
};

export const MemberView: Story = {
  args: {
    ...defaultArgs,
    isAdmin: false,
    currentUserId: "user-2",
    onUpdateName: fn(),
    onChangeMemberRole: fn(),
    onRemoveMember: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Name input should be disabled for non-admins
    const nameInput = canvas.getByLabelText("Workspace Name");
    await expect(nameInput).toBeDisabled();

    // Save button should not exist for non-admins
    await expect(
      canvas.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();

    // Members should still be visible
    await expect(canvas.getByText("Alice Admin")).toBeInTheDocument();
    await expect(canvas.getByText("Bob Member")).toBeInTheDocument();

    // No action menus should exist for non-admins
    const menuButtons = canvas.queryAllByRole("button", { name: /actions/i });
    await expect(menuButtons).toHaveLength(0);
  },
};
