import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Logo } from "./component";
import { expect, within } from "storybook/test";

const meta: Meta<typeof Logo> = {
  title: "Components/Logo",
  component: Logo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Logo>;

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: "The default logo component with company name and pencil icon.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check that there's an SVG or img element (icon)
    const iconElement =
      canvasElement.querySelector("svg") || canvasElement.querySelector("img");
    await expect(iconElement).toBeInTheDocument();

    // Check that there's text content (any text)
    const textElement = canvas.getByText(/.+/);
    await expect(textElement).toBeInTheDocument();
  },
};
