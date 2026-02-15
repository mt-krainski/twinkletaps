import type { ReactNode } from "react";
import { AppSidebar } from "@/components";
import { SidebarInset } from "@/components/ui/sidebar";
import { Navbar } from "@/components";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppSidebar>
        <SidebarInset className="flex flex-1 flex-col">
          <Navbar />
          <div className="flex-1 bg-muted/30 p-6">{children}</div>
        </SidebarInset>
      </AppSidebar>
    </div>
  );
}
