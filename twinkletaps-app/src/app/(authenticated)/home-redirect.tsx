"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLastWorkspace } from "@/lib/workspace-preference";
import { workspacePath } from "@/lib/workspace-paths";

interface HomeRedirectProps {
  workspaceIds: string[];
}

export function HomeRedirect({ workspaceIds }: HomeRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    const lastId = getLastWorkspace();
    const target =
      (lastId && workspaceIds.find((id) => id === lastId)) ??
      workspaceIds[0];

    if (target) {
      router.replace(workspacePath(target));
    }
  }, [router, workspaceIds]);

  return null;
}
