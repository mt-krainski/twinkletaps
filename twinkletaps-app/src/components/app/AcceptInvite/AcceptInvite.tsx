"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/app/invite/actions";
import { AcceptInviteView } from "./AcceptInviteView";

interface AcceptInviteProps {
  token: string;
  workspaceName: string;
  deviceName: string | null;
  type: "workspace" | "device";
  inviterName: string;
}

export function AcceptInvite({
  token,
  workspaceName,
  deviceName,
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
    <AcceptInviteView
      workspaceName={workspaceName}
      deviceName={deviceName}
      type={type}
      inviterName={inviterName}
      loading={loading}
      error={error}
      onAccept={handleAccept}
    />
  );
}
