# Logo Component

A simple logo component that displays the company name with a pencil icon.

## Usage

```tsx
import { Logo } from "@/components/components/Logo/component";

function Header() {
  return (
    <header>
      <Logo />
    </header>
  );
}
```

## Features

- Displays company name from configuration
- Uses Lucide React pencil icon
- Responsive design with Tailwind CSS
- Centered layout with proper spacing

## Configuration

The company name is pulled from the environment variable `NEXT_PUBLIC_COMPANY_NAME` or defaults to "Matt's Starter".
