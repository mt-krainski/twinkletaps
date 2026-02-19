import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { RegisterDeviceDialog } from "./RegisterDevice";
import { MockProviders } from "@/test-utils/storybook";
import type { RegisterDeviceResult } from "@/lib/services/device";

const meta: Meta<typeof RegisterDeviceDialog> = {
  title: "Components/RegisterDevice",
  component: RegisterDeviceDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <MockProviders>
        <Story />
      </MockProviders>
    ),
  ],
  argTypes: {
    open: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof RegisterDeviceDialog>;

const mockCredentials: RegisterDeviceResult = {
  deviceId: "device-1",
  deviceUuid: "uuid-abc-123",
  mqttTopic: "twinkletaps/devices/uuid-abc-123",
  mqttUsername: "mqtt-user",
  mqttPassword: "one-time-secret",
};

function getDialog() {
  return within(document.body).getByRole("dialog");
}

// Plain async functions instead of fn() mocks — Storybook's instrumented fn()
// doesn't properly resolve promises back to the component's async flow.
const resolveSubmit = async () => mockCredentials;
const rejectSubmit = async () => {
  throw new Error("Only workspace admins can register devices");
};
const neverResolveSubmit = () =>
  new Promise<RegisterDeviceResult>(() => {});

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: fn().mockImplementation(async () => mockCredentials),
  },
  play: async () => {
    const dialog = getDialog();
    const canvas = within(dialog);
    await expect(canvas.getByLabelText("Device name")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Register" })).toBeInTheDocument();
  },
};

export const SubmitToSuccess: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: resolveSubmit,
  },
  play: async ({ userEvent: u }) => {
    const dialog = getDialog();
    const canvas = within(dialog);
    await u.type(canvas.getByLabelText("Device name"), "My Lamp");
    await u.click(canvas.getByRole("button", { name: "Register" }));

    await expect(
      await within(document.body).findByText(/Device registered/),
    ).toBeInTheDocument();
  },
};

export const Success: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: resolveSubmit,
  },
  play: async ({ userEvent: u }) => {
    const written: string[] = [];
    const originalWriteText = navigator.clipboard.writeText.bind(
      navigator.clipboard,
    );
    navigator.clipboard.writeText = async (text: string) => {
      written.push(text);
    };

    try {
      const dialog = getDialog();
      const canvas = within(dialog);
      await u.type(canvas.getByLabelText("Device name"), "Living Room");
      await u.click(canvas.getByRole("button", { name: "Register" }));

      const body = within(document.body);
      await expect(
        await body.findByText(/Save these credentials/),
      ).toBeInTheDocument();
      await expect(
        body.getByText("twinkletaps/devices/uuid-abc-123"),
      ).toBeInTheDocument();
      await expect(body.getByText("mqtt-user")).toBeInTheDocument();
      await expect(body.getByText("one-time-secret")).toBeInTheDocument();

      const copyTopicBtn = body.getByRole("button", { name: /Copy Topic/i });
      const copyUsernameBtn = body.getByRole("button", {
        name: /Copy Username/i,
      });
      const copyPasswordBtn = body.getByRole("button", {
        name: /Copy Password/i,
      });

      await u.click(copyTopicBtn);
      await waitFor(
        () => {
          expect(written).toContain(mockCredentials.mqttTopic);
        },
        { timeout: 2000 },
      );

      await u.click(copyUsernameBtn);
      await waitFor(
        () => {
          expect(written).toContain(mockCredentials.mqttUsername);
        },
        { timeout: 2000 },
      );

      await u.click(copyPasswordBtn);
      await waitFor(
        () => {
          expect(written).toContain(mockCredentials.mqttPassword);
        },
        { timeout: 2000 },
      );
    } finally {
      navigator.clipboard.writeText = originalWriteText;
    }
  },
};

export const Loading: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: neverResolveSubmit,
  },
  play: async ({ userEvent: u }) => {
    const dialog = getDialog();
    const canvas = within(dialog);
    await u.type(canvas.getByLabelText("Device name"), "Office");
    await u.click(canvas.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      const d = within(document.body).getByRole("dialog");
      expect(within(d).getByRole("button", { name: /Registering/ })).toBeInTheDocument();
    });
  },
};

export const ErrorState: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: rejectSubmit,
  },
  play: async ({ userEvent: u }) => {
    const dialog = getDialog();
    const canvas = within(dialog);
    await u.type(canvas.getByLabelText("Device name"), "Test");
    await u.click(canvas.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(
        within(document.body).getByText(/Only workspace admins can register devices/),
      ).toBeInTheDocument();
    });
  },
};
