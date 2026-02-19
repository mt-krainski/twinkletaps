"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeviceCard } from "@/components/DeviceCard/component";

export interface DashboardHomeCardDevice {
  id: string;
  name: string;
  deviceUuid?: string;
}

export interface DashboardHomeCardProps {
  devices: DashboardHomeCardDevice[];
  onDeviceClick: (deviceId: string) => void;
  emptyState: "register" | "no-access";
  onRegisterClick?: () => void;
}

export function DashboardHomeCard({
  devices,
  onDeviceClick,
  emptyState,
  onRegisterClick,
}: DashboardHomeCardProps) {
  const isEmpty = devices.length === 0;

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>
          {isEmpty
            ? "Devices in this workspace will appear here."
            : "Your workspace devices. Click a device to open it."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center text-muted-foreground">
            {emptyState === "register" ? (
              <>
                <p>Register your first device to get started.</p>
                <Button onClick={onRegisterClick}>
                  Register your first device
                </Button>
              </>
            ) : (
              <p>No devices available.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                name={device.name}
                deviceUuid={device.deviceUuid}
                onClick={() => onDeviceClick(device.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
