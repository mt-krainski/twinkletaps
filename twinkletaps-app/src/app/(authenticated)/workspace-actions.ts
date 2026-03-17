"use server";

import { createClient } from "@/lib/supabase/server";
import { createWorkspace } from "@/lib/services/workspace";

export async function createWorkspaceAction(
  name: string,
): Promise<{ workspaceId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const workspace = await createWorkspace(user.id, name);
    return { workspaceId: workspace.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create workspace" };
  }
}
