import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { MockProviders } from "@/test-utils/storybook";

const meta: Meta<typeof CreateWorkspaceDialog> = {
  title: "Components/CreateWorkspaceDialog",
  component: CreateWorkspaceDialog,
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
type Story = StoryObj<typeof CreateWorkspaceDialog>;

function getDialog() {
  return within(document.body).getByRole("dialog");
}

// Plain async functions — Storybook's instrumented fn() doesn't properly
// resolve promises back to the component's async flow.
const resolveSubmit = async () => {};
const rejectSubmit = async () => {
  throw new Error("You have reached the maximum number of workspaces");
};
const neverResolveSubmit = () => new Promise<void>(() => {});

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: fn().mockImplementation(async () => {}),
  },
  play: async () => {
    const dialog = getDialog();
    const canvas = within(dialog);
    await expect(
      canvas.getByLabelText("Workspace name"),
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: "Create" }),
    ).toBeInTheDocument();
  },
};

export const SubmitSuccess: Story = {
  args: {
    open: true,
    onOpenChange: fn(),
    onSubmit: resolveSubmit,
    onSuccess: fn(),
  },
  play: async ({ args, userEvent: u }) => {
    const dialog = getDialog();
    const canvas = within(dialog);
    await u.type(canvas.getByLabelText("Workspace name"), "New Project");
    await u.click(canvas.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(args.onSuccess).toHaveBeenCalled();
      expect(args.onOpenChange).toHaveBeenCalledWith(false);
    });
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
    await u.type(canvas.getByLabelText("Workspace name"), "Test");
    await u.click(canvas.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      const d = within(document.body).getByRole("dialog");
      expect(
        within(d).getByRole("button", { name: /Creating/ }),
      ).toBeInTheDocument();
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
    await u.type(canvas.getByLabelText("Workspace name"), "Test");
    await u.click(canvas.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(
        within(document.body).getByText(
          /You have reached the maximum number of workspaces/,
        ),
      ).toBeInTheDocument();
    });
  },
};
