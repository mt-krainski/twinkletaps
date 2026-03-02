"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { getLastWorkspace } from "@/lib/workspace-preference";

export default function Home() {
  const router = useRouter();
  const { workspaces } = useWorkspace();

  useEffect(() => {
    const lastId = getLastWorkspace();
    const target =
      (lastId && workspaces.find((w) => w.id === lastId)?.id) ??
      workspaces[0]?.id;

    if (target) {
      router.replace(`/w/${target}`);
    }
  }, [router, workspaces]);

  return null;
}
