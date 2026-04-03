import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { authCopy } from "@/lib/copy";

interface LogoProps {
  compact?: boolean;
}

export function Logo({ compact }: LogoProps) {
  return (
    <div data-testid="logo" className="flex items-center gap-2">
      <Pencil className="h-6 w-6" />
      <span
        className={cn(
          "text-xl font-bold",
          compact && "hidden sm:inline-block",
        )}
      >
        {authCopy.companyName}
      </span>
    </div>
  );
}
