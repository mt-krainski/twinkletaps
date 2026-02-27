import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { ShareDialog } from "./component";
import { MockProviders } from "@/test-utils/storybook";

const meta: Meta<typeof ShareDialog> = {
  title: "Components/ShareDialog",
  component: ShareDialog,
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
};

export default meta;
type Story = StoryObj<typeof ShareDialog>;

const mockLink = "https://example.com/invite/abc123";

const resolveLink = async () => mockLink;
const rejectLink = async () => {
  throw new Error("Only workspace admins can create invitations");
};
const neverResolveLink = () => new Promise<string>(() => {});

function getDialog() {
  return within(document.body).getByRole("dialog");
}

export const ShareDevice: Story = {
  args: {
    open: true,
    type: "device",
    targetName: "Living Room",
    onGenerateLink: fn().mockImplementation(resolveLink),
    onOpenChange: fn(),
  },
  play: async () => {
    // dialog renders in a portal
    const dialog = getDialog();
    const canvas = within(dialog);
    await expect(canvas.getByText("Share device")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Generate link" }),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Cancel" }),
    ).toBeInTheDocument();
  },
};

export const ShareWorkspace: Story = {
  args: {
    open: true,
    type: "workspace",
    targetName: "Personal Workspace",
    onGenerateLink: fn().mockImplementation(resolveLink),
    onOpenChange: fn(),
  },
  play: async () => {
    // dialog renders in a portal
    const dialog = getDialog();
    const canvas = within(dialog);
    await expect(canvas.getByText("Invite to workspace")).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Generate link" }),
    ).toBeInTheDocument();
  },
};

export const LinkGenerated: Story = {
  args: {
    open: true,
    type: "device",
    targetName: "Living Room",
    onGenerateLink: resolveLink,
    onOpenChange: fn(),
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

      await u.click(canvas.getByRole("button", { name: "Generate link" }));

      await waitFor(() => {
        expect(within(document.body).getByText(mockLink)).toBeInTheDocument();
      });

      await expect(
        within(document.body).getByText(/Link expires in 48 hours/),
      ).toBeInTheDocument();

      const copyBtn = within(document.body).getByRole("button", {
        name: "Copy link",
      });
      await u.click(copyBtn);

      await waitFor(
        () => {
          expect(written).toContain(mockLink);
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
    type: "workspace",
    targetName: "Acme Corp",
    onGenerateLink: neverResolveLink,
    onOpenChange: fn(),
  },
  play: async ({ userEvent: u }) => {
    const dialog = getDialog();
    const canvas = within(dialog);

    await u.click(canvas.getByRole("button", { name: "Generate link" }));

    await waitFor(() => {
      expect(
        within(document.body).getByRole("button", { name: /Generating/ }),
      ).toBeInTheDocument();
    });

    await expect(
      within(document.body).getByRole("button", { name: /Generating/ }),
    ).toBeDisabled();
  },
};

export const ErrorState: Story = {
  args: {
    open: true,
    type: "workspace",
    targetName: "Personal Workspace",
    onGenerateLink: rejectLink,
    onOpenChange: fn(),
  },
  play: async ({ userEvent: u }) => {
    const dialog = getDialog();
    const canvas = within(dialog);

    await u.click(canvas.getByRole("button", { name: "Generate link" }));

    await waitFor(() => {
      expect(
        within(document.body).getByText(
          /Only workspace admins can create invitations/,
        ),
      ).toBeInTheDocument();
    });

    await expect(
      within(document.body).getByRole("button", { name: "Generate link" }),
    ).toBeInTheDocument();
  },
};
