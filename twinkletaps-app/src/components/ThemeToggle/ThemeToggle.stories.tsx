import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThemeToggle } from "./component";
import { ThemeProvider } from "../ThemeProvider/component";
import { expect, userEvent, within } from "storybook/test";
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

    // Check that the theme toggle button exists
    const toggleButton = canvas.getByTestId("theme-toggle");
    await expect(toggleButton).toBeInTheDocument();

    // Check that there are sun and moon icons
    const sunIcon = canvasElement.querySelector('[class*="sun"]');
    const moonIcon = canvasElement.querySelector('[class*="moon"]');
    await expect(sunIcon).toBeInTheDocument();
    await expect(moonIcon).toBeInTheDocument();

    // Test dropdown functionality
    await withDropdown(toggleButton, userEvent, async (menu) => {
      // Verify all menu items are present
      await expect(
        within(menu).getByRole("menuitem", { name: "Light" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "Dark" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "System" })
      ).toBeInTheDocument();

      // Test switching to dark theme
      await userEvent.click(
        within(menu).getByRole("menuitem", { name: "Dark" })
      );

      // Verify dark theme is applied
      await expect(document.documentElement).toHaveClass("dark");
      await expect(document.documentElement).not.toHaveClass("light");
    });

    // Reopen dropdown to test light theme
    await withDropdown(toggleButton, userEvent, async (menu2) => {
      await userEvent.click(
        within(menu2).getByRole("menuitem", { name: "Light" })
      );

      // Verify light theme is applied
      await expect(document.documentElement).toHaveClass("light");
      await expect(document.documentElement).not.toHaveClass("dark");
    });

    // Test system theme - it will apply either light or dark based on system preference
    await withDropdown(toggleButton, userEvent, async (menu3) => {
      await userEvent.click(
        within(menu3).getByRole("menuitem", { name: "System" })
      );

      // System theme applies either light or dark class based on system preference
      // We can't predict which one, so we just verify one of them is applied
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

    // Check that the theme toggle button exists
    const toggleButton = canvas.getByTestId("theme-toggle");
    await expect(toggleButton).toBeInTheDocument();

    // Check that there are sun and moon icons with text
    const sunIcon = canvasElement.querySelector('[class*="sun"]');
    const moonIcon = canvasElement.querySelector('[class*="moon"]');
    const chevronIcon = canvasElement.querySelector('[class*="chevron"]');
    await expect(sunIcon).toBeInTheDocument();
    await expect(moonIcon).toBeInTheDocument();
    await expect(chevronIcon).toBeInTheDocument();

    // Check for text labels
    const lightText = canvas.getByText("Light");
    await expect(lightText).toBeInTheDocument();

    // Test dropdown functionality
    await withDropdown(toggleButton, userEvent, async (menu) => {
      // Verify all menu items are present
      await expect(
        within(menu).getByRole("menuitem", { name: "Light" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "Dark" })
      ).toBeInTheDocument();
      await expect(
        within(menu).getByRole("menuitem", { name: "System" })
      ).toBeInTheDocument();

      // Test switching to dark theme
      await userEvent.click(
        within(menu).getByRole("menuitem", { name: "Dark" })
      );

      // Verify dark theme is applied
      await expect(document.documentElement).toHaveClass("dark");
      await expect(document.documentElement).not.toHaveClass("light");
    });

    // Reopen dropdown to test light theme
    await withDropdown(toggleButton, userEvent, async (menu2) => {
      await userEvent.click(
        within(menu2).getByRole("menuitem", { name: "Light" })
      );

      // Verify light theme is applied
      await expect(document.documentElement).toHaveClass("light");
      await expect(document.documentElement).not.toHaveClass("dark");
    });

    // Test system theme - it will apply either light or dark based on system preference
    await withDropdown(toggleButton, userEvent, async (menu3) => {
      await userEvent.click(
        within(menu3).getByRole("menuitem", { name: "System" })
      );

      // System theme applies either light or dark class based on system preference
      // We can't predict which one, so we just verify one of them is applied
      const hasLightClass =
        document.documentElement.classList.contains("light");
      const hasDarkClass = document.documentElement.classList.contains("dark");
      await expect(hasLightClass || hasDarkClass).toBe(true);
      await expect(hasLightClass && hasDarkClass).toBe(false);
    });
  },
};
