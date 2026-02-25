"use client";

import { useState, useCallback } from "react";
import { sendTap } from "@/app/(authenticated)/devices/actions";
import { TapRecorder } from "@/components/app/TapRecorder";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { WorkspaceRole } from "@/lib/services/workspace";

export interface DeviceViewProps {
  deviceId: string;
  deviceName: string;
  deviceUuid: string;
  mqttTopic: string;
  mqttUsername?: string;
  workspaceRole?: WorkspaceRole;
}

type SendStatus = "idle" | "sending" | "success" | "error";

export function DeviceView({
  deviceId,
  deviceName,
  deviceUuid,
  mqttTopic,
  mqttUsername,
  workspaceRole,
}: DeviceViewProps) {
  const [lastSequence, setLastSequence] = useState<string | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);

  const handleTapComplete = useCallback(
    async (sequence: string) => {
      setSendError(null);
      setSendStatus("sending");
      try {
        await sendTap(deviceId, sequence);
        setLastSequence(sequence);
        setSendStatus("success");
      } catch (err) {
        setSendError(err instanceof Error ? err.message : "Send failed");
        setSendStatus("error");
      }
    },
    [deviceId]
  );

  const isAdmin = workspaceRole === "admin";

  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">{deviceName}</h1>

      <TapRecorder
        onTapComplete={handleTapComplete}
        disabled={sendStatus === "sending"}
      />

      <div className="min-h-[2rem]">
        {sendStatus === "sending" && (
          <p className="text-muted-foreground text-sm">Sending…</p>
        )}
        {sendStatus === "success" && lastSequence && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Sent: {lastSequence}
          </p>
        )}
        {sendStatus === "error" && sendError && (
          <p className="text-sm text-destructive">{sendError}</p>
        )}
        {sendStatus === "idle" && lastSequence && (
          <p className="text-muted-foreground text-sm">
            Last sent: {lastSequence}
          </p>
        )}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Device settings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 font-mono text-sm">
            <div>
              <span className="text-muted-foreground">UUID: </span>
              <span className="break-all">{deviceUuid}</span>
            </div>
            <div>
              <span className="text-muted-foreground">MQTT topic: </span>
              <span className="break-all">{mqttTopic}</span>
            </div>
            <div>
              <span className="text-muted-foreground">MQTT username: </span>
              <span className="break-all">{mqttUsername ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
