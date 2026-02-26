import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { MessageSquare, FileText as FileIcon } from "lucide-react";
import {
  SidebarView,
  type SidebarViewProps,
  type SearchResult,
} from "./SidebarView";
import { expect, fn, within } from "storybook/test";
import { mockDevices } from "@/test-utils/storybook";

type SidebarViewStoryArgs = SidebarViewProps & {
  onHomeClick: () => void;
  onDeviceClick: (id: string) => void;
};

const meta: Meta<SidebarViewStoryArgs> = {
  title: "Components/Sidebar",
  component: SidebarView,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<SidebarViewStoryArgs>;

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

const defaultArgs: SidebarViewProps = {
  devices: mockDevices,
  onDeviceClick: fn(),
  onHomeClick: fn(),
  canRegisterDevice: true,
  onRegisterClick: fn(),
  canInviteToWorkspace: true,
  onInviteClick: fn(),
  searchResults: mockSearchResults,
  searchQuery: "",
  onSearchQueryChange: fn(),
  isSearchModalOpen: false,
  onSearchModalOpenChange: fn(),
};

function SidebarViewWithModalState(
  props: Omit<
    SidebarViewProps,
    "isSearchModalOpen" | "onSearchModalOpenChange" | "searchQuery" | "onSearchQueryChange"
  > & { onSearch?: (q: string) => void }
) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <SidebarView
      {...props}
      isSearchModalOpen={isSearchModalOpen}
      onSearchModalOpenChange={setIsSearchModalOpen}
      searchQuery={searchQuery}
      onSearchQueryChange={(q) => {
        setSearchQuery(q);
        props.onSearch?.(q);
      }}
    />
  );
}

export const Default: Story = {
  args: {
    ...defaultArgs,
    onSearch: fn(),
    onHomeClick: fn(),
    onDeviceClick: fn(),
  },
  render: (args) => (
    <div className="h-screen w-64">
      <SidebarViewWithModalState
        onSearch={args.onSearch}
        searchResults={args.searchResults}
        devices={args.devices}
        onDeviceClick={args.onDeviceClick}
        onHomeClick={args.onHomeClick}
        canRegisterDevice={true}
        onRegisterClick={args.onRegisterClick ?? fn()}
        canInviteToWorkspace={true}
        onInviteClick={args.onInviteClick ?? fn()}
      />
    </div>
  ),
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();
    await expect(canvas.getByText("Devices")).toBeInTheDocument();
    await expect(canvas.getByText("Invite to workspace")).toBeInTheDocument();

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
    ...defaultArgs,
    devices: [],
    canRegisterDevice: false,
    canInviteToWorkspace: false,
    onSearch: fn(),
    onHomeClick: fn(),
  },
  render: (args) => (
    <div className="h-screen w-64">
      <SidebarViewWithModalState
        onSearch={args.onSearch}
        searchResults={args.searchResults}
        devices={args.devices}
        onDeviceClick={args.onDeviceClick}
        onHomeClick={args.onHomeClick}
        canRegisterDevice={false}
        onRegisterClick={fn()}
        canInviteToWorkspace={false}
        onInviteClick={fn()}
      />
    </div>
  ),
  play: async ({ canvasElement, args, userEvent }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText("Search...")).toBeInTheDocument();
    await expect(canvas.getByText("Home")).toBeInTheDocument();
    await expect(canvas.queryByText("Devices")).not.toBeInTheDocument();
    await expect(canvas.queryByText("Invite to workspace")).not.toBeInTheDocument();

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
