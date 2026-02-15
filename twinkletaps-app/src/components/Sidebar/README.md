# AppSidebar Component

A focused sidebar component for application navigation and search functionality using shadcn/ui sidebar components.

## Features

- **Search Modal**: Click the search input to open a full-screen search modal
- **Search Results**: Display a list of search results with icons, titles, and content summaries
- **Navigation**: Home button and organized sections for private and team items
- **Responsive**: Adapts to different content and user states
- **Accessible**: Proper ARIA labels and keyboard navigation

## Usage

```tsx
import { AppSidebar } from "@/components/AppSidebar";
import { Folder, Users } from "lucide-react";

const privateItems = [
  {
    id: "private-1",
    label: "My Documents",
    icon: Folder,
    onClick: () => console.log("Private item clicked"),
  },
];

const teamItems = [
  {
    id: "team-1",
    label: "Team Projects",
    icon: Users,
    onClick: () => console.log("Team item clicked"),
  },
];

function App() {
  return (
    <AppSidebar
      privateItems={privateItems}
      teamItems={teamItems}
      onSearch={(query) => console.log("Search:", query)}
      onHomeClick={() => console.log("Home clicked")}
    />
  );
}
```

## Props

### AppSidebarProps

| Prop            | Type                      | Default | Description                       |
| --------------- | ------------------------- | ------- | --------------------------------- |
| `privateItems`  | `SidebarItem[]`           | `[]`    | Items in the private section      |
| `teamItems`     | `SidebarItem[]`           | `[]`    | Items in the team section         |
| `onSearch`      | `(query: string) => void` | -       | Callback when search is submitted |
| `onHomeClick`   | `() => void`              | -       | Callback when home is clicked     |
| `searchResults` | `SearchResult[]`          | `[]`    | List of search results to display |
| `className`     | `string`                  | -       | Additional CSS classes            |

### SidebarItem

| Prop       | Type                  | Description                      |
| ---------- | --------------------- | -------------------------------- |
| `id`       | `string`              | Unique identifier                |
| `label`    | `string`              | Display text                     |
| `icon`     | `React.ComponentType` | Optional icon component          |
| `href`     | `string`              | Optional link URL                |
| `onClick`  | `() => void`          | Click handler                    |
| `isActive` | `boolean`             | Whether item is currently active |

### SearchResult

| Prop      | Type                  | Description                    |
| --------- | --------------------- | ------------------------------ |
| `id`      | `string`              | Unique identifier              |
| `title`   | `string`              | Display title                  |
| `content` | `string`              | Content summary or description |
| `icon`    | `React.ComponentType` | Optional icon component        |
| `onClick` | `() => void`          | Click handler                  |

## Layout

The sidebar has a fixed width of 256px (`w-64`) and uses a vertical layout:

- **Search Bar**: At the top - click to open search modal
- **Navigation**: Home button and organized sections for private and team items
- **Scrollable Content**: Navigation items can scroll if they exceed the available height

## Search Modal

The search modal provides a clean search experience:

- **Full-screen Modal**: Opens when clicking the search input
- **Search Results**: Displays a list of results with icons, titles, and content summaries
- **Dynamic Results**: Shows search results based on input
- **Keyboard Navigation**: Full keyboard support with auto-focus on the search input

## Styling

The component uses Tailwind CSS classes and follows the design system patterns:

- Fixed width of 256px (`w-64`)
- Full height (`h-full`)
- Responsive borders and spacing
- Consistent button styling with shadcn/ui
- Proper focus states and accessibility

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management for search input
- Screen reader friendly structure
