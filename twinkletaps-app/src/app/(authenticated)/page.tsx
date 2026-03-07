import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserWorkspaces } from "@/lib/services";
import { HomeRedirect } from "./home-redirect";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const userWorkspaces = await getUserWorkspaces(user.id);
  const workspaceIds = userWorkspaces.map((m) => m.workspace.id);

  if (workspaceIds.length === 0) {
    redirect("/account");
  }

  // Single workspace: skip client-side localStorage check
  if (workspaceIds.length === 1) {
    redirect(`/w/${workspaceIds[0]}`);
  }

  // Multiple workspaces: use client component to check localStorage preference
  return <HomeRedirect workspaceIds={workspaceIds} />;
}
