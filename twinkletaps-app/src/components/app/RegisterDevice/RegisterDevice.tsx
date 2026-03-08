"use client";

import { useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { config } from "@/lib/config";
import type { RegisterDeviceResult } from "@/lib/services/device";

export interface RegisterDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<RegisterDeviceResult>;
  onSuccess?: () => void;
}

function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={copy}
      aria-label={`Copy ${label}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

function CredentialRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Label className="shrink-0 text-muted-foreground w-24 text-sm">
        {label}
      </Label>
      <code className="min-w-0 flex-1 truncate rounded border bg-muted px-2 py-1.5 text-sm">
        {value}
      </code>
      <CopyButton value={value} label={label} />
    </div>
  );
}

export function RegisterDeviceDialog({
  open,
  onOpenChange,
  onSubmit,
  onSuccess,
}: RegisterDeviceDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<RegisterDeviceResult | null>(
    null,
  );

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setError(null);
      setCredentials(null);
      formRef.current?.reset();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const deviceName = (formData.get("deviceName") as string).trim();
    if (!deviceName) {
      setError("Device name is required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await onSubmit(deviceName);
      setCredentials(result);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const mqttBrokerUrl = config.mqtt.brokerUrl;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {credentials ? "Device registered" : "Register device"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {credentials
              ? "MQTT credentials for the new device. Save them; the password will not be shown again."
              : "Enter a name for the device and register it to get MQTT credentials."}
          </DialogDescription>
        </DialogHeader>

        {credentials ? (
          <>
            <p className="text-muted-foreground text-sm">
              Save these credentials — the password will not be shown again.
            </p>
            <Card className="w-full min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">MQTT credentials</CardTitle>
                <CardDescription>
                  Use these to connect your device to the broker.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {mqttBrokerUrl && (
                  <CredentialRow label="Host" value={mqttBrokerUrl} />
                )}
                <CredentialRow label="Topic" value={credentials.mqttTopic} />
                <CredentialRow label="Username" value={credentials.mqttUsername} />
                <CredentialRow label="Password" value={credentials.mqttPassword} />
              </CardContent>
            </Card>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="device-name">Device name</Label>
              <Input
                id="device-name"
                name="deviceName"
                placeholder="e.g. Living room lamp"
                disabled={isSubmitting}
                autoFocus
                maxLength={100}
              />
            </div>
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registering…" : "Register"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
