import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDevice } from "@/lib/services/device";
import { devicePath } from "@/lib/workspace-paths";

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

  redirect(devicePath(device.workspaceId, device.id));
}
