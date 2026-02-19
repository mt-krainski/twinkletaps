"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const UUID_TRUNCATE_LEN = 8;

function truncateUuid(uuid: string): string {
  const cleaned = uuid.replace(/-/g, "");
  if (cleaned.length <= UUID_TRUNCATE_LEN) return cleaned;
  return `${cleaned.slice(0, UUID_TRUNCATE_LEN)}…`;
}

export interface DeviceCardProps {
  name: string;
  deviceUuid?: string;
  onClick: () => void;
  className?: string;
}

export function DeviceCard({
  name,
  deviceUuid,
  onClick,
  className,
}: DeviceCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className={cn(
        "min-w-32 cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardHeader className="pb-2">
        <span className="font-medium truncate" title={name}>
          {name}
        </span>
      </CardHeader>
      {deviceUuid && (
        <CardContent className="pt-0">
          <code className="text-xs text-muted-foreground font-mono">
            {truncateUuid(deviceUuid)}
          </code>
        </CardContent>
      )}
    </Card>
  );
}
