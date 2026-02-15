import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MessageSquare, FileText as FileIcon } from "lucide-react";
import {
  AppSidebar,
  type AppSidebarProps,
  type SearchResult,
} from "./component";
import { expect, fn, within } from "storybook/test";
import { MockProviders, mockTeams } from "@/test-utils/storybook";

type SidebarStoryArgs = AppSidebarProps & {
  onHomeClick: () => void;
  onTeamClick: (id: string) => void;
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

const privateTeamNames = mockTeams
  .filter((t) => t.isPrivate)
  .map((t) => t.name);
const sharedTeamNames = mockTeams
  .filter((t) => !t.isPrivate)
  .map((t) => t.name);

export const Default: Story = {
  args: {
    onSearch: fn(),
    searchResults: mockSearchResults,
    onHomeClick: fn(),
    onTeamClick: fn(),
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
          navigateToTeam: context.args.onTeamClick,
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

    // Check that all expected elements are visible
    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();
    await expect(canvas.getByText("Private")).toBeInTheDocument();
    await expect(canvas.getByText("Team")).toBeInTheDocument();

    for (const name of [...privateTeamNames, ...sharedTeamNames]) {
      await expect(canvas.getByText(name)).toBeInTheDocument();
    }

    // Test Home button click
    const homeButton = canvas.getByText("Home");
    await userEvent.click(homeButton);
    await expect(args.onHomeClick).toHaveBeenCalled();

    // Test private item clicks
    await userEvent.click(canvas.getByText(privateTeamNames[0]));
    await expect(args.onTeamClick).toHaveBeenCalledWith("private-1");

    // Test team item clicks
    await userEvent.click(canvas.getByText(sharedTeamNames[0]));
    await expect(args.onTeamClick).toHaveBeenCalledWith("team-a");

    // Test search functionality
    const searchButton = canvas.getByText("Search...");
    await userEvent.click(searchButton);

    // Wait for modal to open and check search results
    const searchModal = await within(document.body).findByRole("dialog");
    await expect(searchModal).toBeInTheDocument();

    const searchInput = within(searchModal).getByPlaceholderText(
      "Type a command or search...",
    );
    await userEvent.type(searchInput, "test query");
    await expect(args.onSearch).toHaveBeenCalledWith("test query");

    // Test search result clicks
    const chatResult = within(searchModal).getByText(
      "Chat about React components",
    );
    await userEvent.click(chatResult);
  },
};

export const WithoutTeams: Story = {
  args: {
    onSearch: fn(),
    onHomeClick: fn(),
  },
  decorators: [
    (Story, context) => (
      <MockProviders
        workspaceValue={{
          teams: [],
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

    // Check that only basic elements are visible
    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();

    // Check that no sections are visible
    await expect(canvas.queryByText("Private")).not.toBeInTheDocument();
    await expect(canvas.queryByText("Team")).not.toBeInTheDocument();

    // Test Home button click
    await userEvent.click(canvas.getByText("Home"));
    await expect(args.onHomeClick).toHaveBeenCalled();

    // Test search functionality
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

export const OnlyPrivateTeams: Story = {
  args: {
    onSearch: fn(),
    onHomeClick: fn(),
    onTeamClick: fn(),
  },
  decorators: [
    (Story, context) => (
      <MockProviders
        workspaceValue={{
          teams: mockTeams.filter((t) => t.isPrivate),
          navigateHome: context.args.onHomeClick,
          navigateToTeam: context.args.onTeamClick,
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

    // Check that expected elements are visible
    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();
    await expect(canvas.getByText("Private")).toBeInTheDocument();

    // Check that team section is NOT visible
    await expect(canvas.queryByText("Team")).not.toBeInTheDocument();

    for (const name of privateTeamNames) {
      await expect(canvas.getByText(name)).toBeInTheDocument();
    }

    // Test Home button click
    await userEvent.click(canvas.getByText("Home"));
    await expect(args.onHomeClick).toHaveBeenCalled();

    // Test private item clicks
    await userEvent.click(canvas.getByText(privateTeamNames[0]));
    await expect(args.onTeamClick).toHaveBeenCalledWith("private-1");
  },
};

export const OnlySharedTeams: Story = {
  args: {
    onSearch: fn(),
    onHomeClick: fn(),
    onTeamClick: fn(),
  },
  decorators: [
    (Story, context) => (
      <MockProviders
        workspaceValue={{
          teams: mockTeams.filter((t) => !t.isPrivate),
          navigateHome: context.args.onHomeClick,
          navigateToTeam: context.args.onTeamClick,
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

    // Check that expected elements are visible
    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();
    await expect(canvas.getByText("Team")).toBeInTheDocument();

    // Check that private section is NOT visible
    await expect(canvas.queryByText("Private")).not.toBeInTheDocument();

    for (const name of sharedTeamNames) {
      await expect(canvas.getByText(name)).toBeInTheDocument();
    }

    // Test Home button click
    await userEvent.click(canvas.getByText("Home"));
    await expect(args.onHomeClick).toHaveBeenCalled();

    // Test team item clicks
    await userEvent.click(canvas.getByText(sharedTeamNames[0]));
    await expect(args.onTeamClick).toHaveBeenCalledWith("team-a");
  },
};
