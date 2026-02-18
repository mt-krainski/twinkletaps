import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MessageSquare, FileText as FileIcon } from "lucide-react";
import {
  AppSidebar,
  type AppSidebarProps,
  type SearchResult,
} from "./component";
import { expect, fn, within } from "storybook/test";
import { MockProviders, mockDevices } from "@/test-utils/storybook";

type SidebarStoryArgs = AppSidebarProps & {
  onHomeClick: () => void;
  onDeviceClick: (id: string) => void;
};

const meta: Meta<SidebarStoryArgs> = {
  title: "Components/Sidebar",
  component: AppSidebar,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<SidebarStoryArgs>;

const mockSearchResults: SearchResult[] = [
  {
    id: "result-1",
    title: "Chat about React components",
    content:
      "Discussion about building reusable UI components with React and TypeScript",
    icon: MessageSquare,
    onClick: () => console.log("Chat result clicked"),
  },
  {
    id: "result-2",
    title: "Project documentation",
    content:
      "Complete documentation for the current project setup and architecture",
    icon: FileIcon,
    onClick: () => console.log("Documentation result clicked"),
  },
  {
    id: "result-3",
    title: "API integration guide",
    content:
      "Step-by-step guide for integrating external APIs into the application",
    icon: FileIcon,
    onClick: () => console.log("API guide result clicked"),
  },
];

const deviceNames = mockDevices.map((d) => d.name);

export const Default: Story = {
  args: {
    onSearch: fn(),
    searchResults: mockSearchResults,
    onHomeClick: fn(),
    onDeviceClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Click on the search input to open the search modal with search results.",
      },
    },
  },
  decorators: [
    (Story, context) => (
      <MockProviders
        workspaceValue={{
          navigateHome: context.args.onHomeClick,
          navigateToDevice: context.args.onDeviceClick,
        }}
      >
        <div className="h-screen w-64">
          <Story />
        </div>
      </MockProviders>
    ),
  ],
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();
    await expect(canvas.getByText("Devices")).toBeInTheDocument();

    for (const name of deviceNames) {
      await expect(canvas.getByText(name)).toBeInTheDocument();
    }

    const homeButton = canvas.getByText("Home");
    await userEvent.click(homeButton);
    await expect(args.onHomeClick).toHaveBeenCalled();

    await userEvent.click(canvas.getByText(deviceNames[0]));
    await expect(args.onDeviceClick).toHaveBeenCalledWith(mockDevices[0].id);

    await userEvent.click(canvas.getByText(deviceNames[1]));
    await expect(args.onDeviceClick).toHaveBeenCalledWith(mockDevices[1].id);

    const searchButton = canvas.getByText("Search...");
    await userEvent.click(searchButton);

    const searchModal = await within(document.body).findByRole("dialog");
    await expect(searchModal).toBeInTheDocument();

    const searchInput = within(searchModal).getByPlaceholderText(
      "Type a command or search...",
    );
    await userEvent.type(searchInput, "test query");
    await expect(args.onSearch).toHaveBeenCalledWith("test query");

    const chatResult = within(searchModal).getByText(
      "Chat about React components",
    );
    await userEvent.click(chatResult);
  },
};

export const WithoutDevices: Story = {
  args: {
    onSearch: fn(),
    onHomeClick: fn(),
  },
  decorators: [
    (Story, context) => (
      <MockProviders
        workspaceValue={{
          devices: [],
          workspaceRole: "member",
          navigateHome: context.args.onHomeClick,
        }}
      >
        <div className="h-screen w-64">
          <Story />
        </div>
      </MockProviders>
    ),
  ],
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();
    await expect(canvas.queryByText("Devices")).not.toBeInTheDocument();

    await userEvent.click(canvas.getByText("Home"));
    await expect(args.onHomeClick).toHaveBeenCalled();

    const searchButton = canvas.getByText("Search...");
    await userEvent.click(searchButton);

    const searchModal = await within(document.body).findByRole("dialog");
    await expect(searchModal).toBeInTheDocument();

    const searchInput = within(searchModal).getByPlaceholderText(
      "Type a command or search...",
    );
    await userEvent.type(searchInput, "test query");
    await expect(args.onSearch).toHaveBeenCalledWith("test query");
  },
};
