import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app/Sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Navbar } from "@/components/app/Navbar";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar>
        <SidebarInset className="flex flex-1 flex-col">
          <Navbar />
          <div className="flex-1 bg-muted/30 p-6">{children}</div>
        </SidebarInset>
      </AppSidebar>
    </SidebarProvider>
  );
}
