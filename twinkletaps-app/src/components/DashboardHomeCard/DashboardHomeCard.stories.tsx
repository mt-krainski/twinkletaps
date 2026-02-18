import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { DashboardHomeCard } from "./component";

const meta: Meta<typeof DashboardHomeCard> = {
  title: "Components/DashboardHomeCard",
  component: DashboardHomeCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onDeviceClick: { action: "deviceClick" },
    onRegisterClick: { action: "registerClick" },
  },
};

export default meta;
type Story = StoryObj<typeof DashboardHomeCard>;

const mockDevices = [
  {
    id: "device-1",
    name: "Living Room",
    deviceUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
  {
    id: "device-2",
    name: "Bedroom",
    deviceUuid: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  },
  {
    id: "device-3",
    name: "Office",
    deviceUuid: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  },
];

export const EmptyRegister: Story = {
  args: {
    devices: [],
    emptyState: "register",
    onDeviceClick: fn(),
    onRegisterClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Dashboard")).toBeInTheDocument();
    await expect(
      canvas.getByText("Register your first device to get started."),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Register your first device" }),
    ).toBeInTheDocument();
    await canvas.getByRole("button", { name: "Register your first device" }).click();
    expect(args.onRegisterClick).toHaveBeenCalledTimes(1);
  },
};

export const EmptyNoAccess: Story = {
  args: {
    devices: [],
    emptyState: "no-access",
    onDeviceClick: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Dashboard")).toBeInTheDocument();
    await expect(canvas.getByText("No devices available.")).toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: "Register your first device" }),
    ).not.toBeInTheDocument();
  },
};

export const WithDevices: Story = {
  args: {
    devices: mockDevices,
    emptyState: "register",
    onDeviceClick: fn(),
    onRegisterClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Dashboard")).toBeInTheDocument();
    await expect(canvas.getByText("Living Room")).toBeInTheDocument();
    await expect(canvas.getByText("Bedroom")).toBeInTheDocument();
    await expect(canvas.getByText("Office")).toBeInTheDocument();
    await canvas.getByText("Living Room").click();
    expect(args.onDeviceClick).toHaveBeenCalledWith("device-1");
  },
};
