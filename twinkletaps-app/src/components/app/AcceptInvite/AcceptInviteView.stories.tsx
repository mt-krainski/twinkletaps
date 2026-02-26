import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { AcceptInviteView } from "./AcceptInviteView";

const meta: Meta<typeof AcceptInviteView> = {
  title: "Components/AcceptInvite",
  component: AcceptInviteView,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AcceptInviteView>;

const baseArgs = {
  workspaceName: "My Workspace",
  deviceName: null,
  role: "member",
  type: "workspace" as const,
  inviterName: "Alice",
  loading: false,
  error: null,
  onAccept: fn(),
};

export const WorkspaceInvite: Story = {
  args: baseArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("You're invited!")).toBeInTheDocument();
    await expect(canvas.getByText(/Alice has invited you to join/)).toBeInTheDocument();
    await expect(canvas.getAllByText("My Workspace").length).toBeGreaterThan(0);
    await expect(canvas.getByRole("button", { name: "Accept Invitation" })).toBeInTheDocument();
  },
};

// Device invite shows the device name alongside workspace
export const DeviceInvite: Story = {
  args: {
    ...baseArgs,
    deviceName: "Living Room",
    type: "device",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/a device in/)).toBeInTheDocument();
    await expect(canvas.getByText("Living Room")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    ...baseArgs,
    loading: true,
    onAccept: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Accepting…")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Accepting/ })).toBeDisabled();
  },
};

export const WithError: Story = {
  args: {
    ...baseArgs,
    error: "You are already a member of this workspace.",
    onAccept: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText("You are already a member of this workspace."),
    ).toBeInTheDocument();
    // Button is still enabled — user can retry
    const button = canvas.getByRole("button", { name: "Accept Invitation" });
    await expect(button).not.toBeDisabled();
    await button.click();
    expect(args.onAccept).toHaveBeenCalledTimes(1);
  },
};
