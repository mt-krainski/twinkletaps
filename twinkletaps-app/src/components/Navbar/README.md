# Navbar Component

A top navigation bar component with company logo, workspace selector, and user menu with dropdown options.

## Features

- **Company Logo**: Displays the application logo on the far left
- **Workspace Selector**: Dropdown to switch between personal and team workspaces in the center
- **User Menu**: User avatar on the far right with dropdown containing account, settings, and logout options
- **Responsive**: Adapts to different screen sizes
- **Accessible**: Proper ARIA labels and keyboard navigation

## Usage

```tsx
import { Navbar } from "@/components/Navbar";

const workspaces = [
  { id: "personal", name: "Personal Workspace", type: "personal" },
  { id: "team-1", name: "Acme Corp", type: "team" },
];

const user = {
  name: "John Doe",
  email: "john@example.com",
  avatar: "https://example.com/avatar.jpg",
};

function App() {
  return (
    <Navbar
      workspaces={workspaces}
      selectedWorkspaceId="personal"
      user={user}
      onWorkspaceChange={(workspaceId) =>
        console.log("Workspace:", workspaceId)
      }
      onAccountClick={() => console.log("Account clicked")}
      onSettingsClick={() => console.log("Settings clicked")}
      onLogoutClick={() => console.log("Logout clicked")}
    />
  );
}
```

## Props

### NavbarProps

| Prop                  | Type                            | Default | Description                          |
| --------------------- | ------------------------------- | ------- | ------------------------------------ |
| `workspaces`          | `Workspace[]`                   | `[]`    | Array of available workspaces        |
| `selectedWorkspaceId` | `string`                        | -       | Currently selected workspace ID      |
| `onWorkspaceChange`   | `(workspaceId: string) => void` | -       | Callback when workspace changes      |
| `user`                | `User`                          | -       | User information for profile section |
| `onAccountClick`      | `() => void`                    | -       | Callback when account is clicked     |
| `onSettingsClick`     | `() => void`                    | -       | Callback when settings is clicked    |
| `onLogoutClick`       | `() => void`                    | -       | Callback when logout is clicked      |
| `className`           | `string`                        | -       | Additional CSS classes               |

### Workspace

| Prop   | Type                   | Description       |
| ------ | ---------------------- | ----------------- |
| `id`   | `string`               | Unique identifier |
| `name` | `string`               | Display name      |
| `type` | `"personal" \| "team"` | Workspace type    |

### User

| Prop     | Type     | Description          |
| -------- | -------- | -------------------- |
| `name`   | `string` | User's display name  |
| `email`  | `string` | User's email address |
| `avatar` | `string` | Optional avatar URL  |

## Layout

The navbar has a fixed height of 64px (`h-16`) and uses a two-column layout:

- **Left**: Company logo and workspace selector (when workspaces are provided)
- **Right**: User avatar and dropdown menu

## Styling

The component uses Tailwind CSS classes and follows the design system patterns:

- Fixed height of 64px
- Border bottom for separation
- Proper spacing and alignment
- Consistent button styling with shadcn/ui
- Responsive design with mobile considerations

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management for dropdowns
- Screen reader friendly structure
- Semantic HTML structure
