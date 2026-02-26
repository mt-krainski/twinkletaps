import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDevice } from "@/lib/services/device";
import { DeviceView } from "./device-view";

type PageProps = {
  params: Promise<{ deviceId: string }>;
};

export default async function DevicePage({ params }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { deviceId } = await params;
  const device = await getDevice(user.id, deviceId);

  if (!device) {
    redirect("/");
  }

  return (
    <DeviceView
      deviceId={device.id}
      workspaceId={device.workspaceId}
      deviceName={device.name}
      deviceUuid={device.deviceUuid}
      mqttTopic={device.mqttTopic}
      mqttUsername={device.mqttUsername ?? undefined}
      workspaceRole={device.workspaceRole ?? undefined}
    />
  );
}
