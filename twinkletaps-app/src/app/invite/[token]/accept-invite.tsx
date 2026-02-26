"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/app/invite/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AcceptInviteProps {
  token: string;
  workspaceName: string;
  deviceName: string | null;
  role: string;
  type: "workspace" | "device";
  inviterName: string;
}

export function AcceptInvite({
  token,
  workspaceName,
  deviceName,
  role,
  type,
  inviterName,
}: AcceptInviteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const { redirectTo } = await acceptInvitationAction(token);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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
          onClick={handleAccept}
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
