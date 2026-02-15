# ThemeToggle

A theme toggle component that allows users to switch between light, dark, and system themes. The component supports two visual variants: icon-only and text with icons.

## Features

- **Icon Variant**: Compact icon-only display with animated sun/moon icons
- **Text Variant**: Text labels with icons and a chevron dropdown indicator
- **Theme Support**: Light, dark, and system theme options
- **Accessibility**: Screen reader support and proper ARIA labels
- **Responsive**: Adapts to different screen sizes

## Props

| Prop      | Type               | Default  | Description                            |
| --------- | ------------------ | -------- | -------------------------------------- |
| `variant` | `"icon" \| "text"` | `"icon"` | The visual variant of the theme toggle |

## Variants

### Icon Variant (`variant="icon"`)

- Compact button with animated sun/moon icons
- Uses `size="icon"` for square button layout
- Icons animate and scale based on current theme

### Text Variant (`variant="text"`)

- Button with text labels and icons
- Shows current theme with appropriate icon
- Includes chevron dropdown indicator
- Uses `size="default"` for standard button layout

## Usage

```tsx
import { ThemeToggle } from "@/components";

// Default icon variant
<ThemeToggle />

// Explicit icon variant
<ThemeToggle variant="icon" />

// Text variant
<ThemeToggle variant="text" />
```

## Dependencies

- `@/components/ui/button` - Button component
- `@/components/ui/dropdown-menu` - Dropdown menu components
- `lucide-react` - Icons (Sun, Moon, Monitor, ChevronDown)
- `@/components/ThemeProvider` - Theme context and state management
