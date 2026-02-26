"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface AcceptInviteViewProps {
  workspaceName: string;
  deviceName: string | null;
  role: string;
  type: "workspace" | "device";
  inviterName: string;
  loading: boolean;
  error: string | null;
  onAccept: () => void;
}

export function AcceptInviteView({
  workspaceName,
  deviceName,
  role,
  type,
  inviterName,
  loading,
  error,
  onAccept,
}: AcceptInviteViewProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>You&apos;re invited!</CardTitle>
        <CardDescription>
          {inviterName} has invited you to join{" "}
          {type === "device" ? `a device in ` : ""}
          <span className="font-semibold text-foreground">{workspaceName}</span>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Workspace:</span>
          <span className="font-medium">{workspaceName}</span>
        </div>
        {deviceName && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Device:</span>
            <span className="font-medium">{deviceName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Role:</span>
          <span className="font-medium capitalize">{role}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {error && (
          <p className="text-sm text-destructive w-full">{error}</p>
        )}
        <Button
          onClick={onAccept}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Accepting…
            </>
          ) : (
            "Accept Invitation"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
