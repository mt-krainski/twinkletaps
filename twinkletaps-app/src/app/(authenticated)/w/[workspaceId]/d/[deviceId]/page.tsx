import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDevice } from "@/lib/services/device";
import { DeviceView } from "@/app/(authenticated)/devices/[deviceId]/device-view";

type PageProps = {
  params: Promise<{ workspaceId: string; deviceId: string }>;
};

export default async function WorkspaceDevicePage({ params }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { deviceId, workspaceId } = await params;
  const device = await getDevice(user.id, deviceId);

  if (!device || device.workspaceId !== workspaceId) {
    redirect(`/w/${workspaceId}`);
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
