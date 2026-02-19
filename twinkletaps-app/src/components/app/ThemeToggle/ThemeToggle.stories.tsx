import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { expect, within } from "storybook/test";
import { withDropdown } from "@/test-utils/storybook";

const meta: Meta<typeof ThemeToggle> = {
  title: "Components/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["icon", "text"],
      description: "The visual variant of the theme toggle",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Icon: Story = {
  args: {
    variant: "icon",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A theme toggle component with icon-only display that allows switching between light, dark, and system themes.",
      },
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const toggleButton = canvas.getByTestId("theme-toggle");
    await expect(toggleButton).toBeInTheDocument();

    const sunIcon = canvasElement.querySelector('[class*="sun"]');
    const moonIcon = canvasElement.querySelector('[class*="moon"]');
    await expect(sunIcon).toBeInTheDocument();
    await expect(moonIcon).toBeInTheDocument();

    await withDropdown(toggleButton, userEvent, async (menu) => {
      await expect(
        within(menu).getByRole("menuitem", { name: "Light" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "Dark" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "System" })
      ).toBeInTheDocument();

      await userEvent.click(
        within(menu).getByRole("menuitem", { name: "Dark" })
      );

      await expect(document.documentElement).toHaveClass("dark");
      await expect(document.documentElement).not.toHaveClass("light");
    });

    await withDropdown(toggleButton, userEvent, async (menu2) => {
      await userEvent.click(
        within(menu2).getByRole("menuitem", { name: "Light" })
      );

      await expect(document.documentElement).toHaveClass("light");
      await expect(document.documentElement).not.toHaveClass("dark");
    });

    await withDropdown(toggleButton, userEvent, async (menu3) => {
      await userEvent.click(
        within(menu3).getByRole("menuitem", { name: "System" })
      );

      const hasLightClass =
        document.documentElement.classList.contains("light");
      const hasDarkClass = document.documentElement.classList.contains("dark");
      await expect(hasLightClass || hasDarkClass).toBe(true);
      await expect(hasLightClass && hasDarkClass).toBe(false);
    });
  },
};

export const Text: Story = {
  args: {
    variant: "text",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A theme toggle component with text labels that allows switching between light, dark, and system themes.",
      },
    },
  },
  play: async ({ canvasElement, userEvent }) => {
    const canvas = within(canvasElement);

    const toggleButton = canvas.getByTestId("theme-toggle");
    await expect(toggleButton).toBeInTheDocument();

    const sunIcon = canvasElement.querySelector('[class*="sun"]');
    const moonIcon = canvasElement.querySelector('[class*="moon"]');
    const chevronIcon = canvasElement.querySelector('[class*="chevron"]');
    await expect(sunIcon).toBeInTheDocument();
    await expect(moonIcon).toBeInTheDocument();
    await expect(chevronIcon).toBeInTheDocument();

    const lightText = canvas.getByText("Light");
    await expect(lightText).toBeInTheDocument();

    await withDropdown(toggleButton, userEvent, async (menu) => {
      await expect(
        within(menu).getByRole("menuitem", { name: "Light" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "Dark" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "System" })
      ).toBeInTheDocument();

      await userEvent.click(
        within(menu).getByRole("menuitem", { name: "Dark" })
      );

      await expect(document.documentElement).toHaveClass("dark");
      await expect(document.documentElement).not.toHaveClass("light");
    });

    await withDropdown(toggleButton, userEvent, async (menu2) => {
      await userEvent.click(
        within(menu2).getByRole("menuitem", { name: "Light" })
      );

      await expect(document.documentElement).toHaveClass("light");
      await expect(document.documentElement).not.toHaveClass("dark");
    });

    await withDropdown(toggleButton, userEvent, async (menu3) => {
      await userEvent.click(
        within(menu3).getByRole("menuitem", { name: "System" })
      );

      const hasLightClass =
        document.documentElement.classList.contains("light");
      const hasDarkClass = document.documentElement.classList.contains("dark");
      await expect(hasLightClass || hasDarkClass).toBe(true);
      await expect(hasLightClass && hasDarkClass).toBe(false);
    });
  },
};
