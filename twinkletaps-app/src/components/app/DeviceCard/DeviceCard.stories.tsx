import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { DeviceCard } from "./DeviceCard";

const meta: Meta<typeof DeviceCard> = {
  title: "Components/DeviceCard",
  component: DeviceCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    onClick: { action: "clicked" },
  },
};

export default meta;
type Story = StoryObj<typeof DeviceCard>;

export const Default: Story = {
  args: {
    name: "Living Room",
    deviceUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Living Room")).toBeInTheDocument();
    await expect(canvas.getByText("a1b2c3d4…")).toBeInTheDocument();
    await canvas.getByRole("button").click();
    expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const MultipleDevices: Story = {
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-[600px]">
      <DeviceCard
        name="Living Room"
        deviceUuid="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        onClick={fn()}
      />
      <DeviceCard
        name="Bedroom"
        deviceUuid="b2c3d4e5-f6a7-8901-bcde-f12345678901"
        onClick={fn()}
      />
      <DeviceCard
        name="Office"
        deviceUuid="c3d4e5f6-a7b8-9012-cdef-123456789012"
        onClick={fn()}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Living Room")).toBeInTheDocument();
    await expect(canvas.getByText("Bedroom")).toBeInTheDocument();
    await expect(canvas.getByText("Office")).toBeInTheDocument();
  },
};

export const WithoutUuid: Story = {
  args: {
    name: "Legacy Device",
    onClick: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Legacy Device")).toBeInTheDocument();
  },
};
