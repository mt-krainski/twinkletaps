"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface AcceptInviteViewProps {
  workspaceName: string;
  deviceName: string | null;
  type: "workspace" | "device";
  inviterName: string;
  loading: boolean;
  error: string | null;
  onAccept: () => void;
}

export function AcceptInviteView({
  workspaceName,
  deviceName,
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
          {type === "device"
            ? `${inviterName} has invited you to control ${deviceName} in ${workspaceName}`
            : `${inviterName} has invited you to join ${workspaceName}`}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-3">
        {error && (
          <p className="text-sm text-destructive w-full">{error}</p>
        )}
        <Button
          onClick={onAccept}
          disabled={loading || !!error}
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
