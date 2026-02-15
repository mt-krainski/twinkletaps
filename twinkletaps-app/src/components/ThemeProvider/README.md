# ThemeProvider Component

A React context provider that manages theme state and provides theme switching functionality.

## Usage

```tsx
import { ThemeProvider } from "@/components/ThemeProvider/component";

function App() {
  return (
    <ThemeProvider>
      <YourApp />
    </ThemeProvider>
  );
}
```

## Features

- Manages theme state (light, dark, system)
- Automatic system preference detection
- Theme persistence using localStorage
- Real-time system theme change detection
- Provides theme context to child components

## API

### ThemeProvider Props

- `children`: React nodes to be wrapped by the provider

### useTheme Hook

Returns an object with:

- `theme`: Current theme setting ("light" | "dark" | "system")
- `setTheme`: Function to change the theme
- `resolvedTheme`: The actual applied theme ("light" | "dark")

## Theme Logic

- **Light/Dark**: Directly applies the selected theme
- **System**: Automatically follows `prefers-color-scheme` media query
- Changes are persisted to localStorage
- System preference changes are detected in real-time

## CSS Classes

The provider automatically adds/removes `light` or `dark` classes to the `<html>` element, which triggers the CSS variables defined in your global styles.
