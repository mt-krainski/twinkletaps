"use client";

import { type ReactNode } from "react";
import { Search, Home, Lightbulb, Plus, UserPlus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

export interface SidebarViewProps {
  onSearch?: (query: string) => void;
  searchResults?: SearchResult[];
  className?: string;
  children?: ReactNode;
  devices: { id: string; name: string }[];
  onDeviceClick: (id: string) => void;
  onHomeClick: () => void;
  canRegisterDevice: boolean;
  onRegisterClick: () => void;
  canAccessSettings: boolean;
  onSettingsClick: () => void;
  canInviteToWorkspace: boolean;
  onInviteClick: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  isSearchModalOpen: boolean;
  onSearchModalOpenChange: (open: boolean) => void;
}

export function SidebarView(props: SidebarViewProps) {
  return (
    <SidebarProvider>
      <SidebarViewInner {...props} />
    </SidebarProvider>
  );
}

function SidebarViewInner({
  onSearch,
  searchResults = [],
  className,
  children,
  devices,
  onDeviceClick,
  onHomeClick,
  canRegisterDevice,
  onRegisterClick,
  canAccessSettings,
  onSettingsClick,
  canInviteToWorkspace,
  onInviteClick,
  searchQuery,
  onSearchQueryChange,
  isSearchModalOpen,
  onSearchModalOpenChange,
}: SidebarViewProps) {
  const { setOpenMobile, isMobile } = useSidebar();

  // Close the mobile sidebar Sheet after navigation
  const withMobileClose = <T extends unknown[]>(callback: (...args: T) => void) => {
    return (...args: T) => {
      callback(...args);
      if (isMobile) setOpenMobile(false);
    };
  };

  return (
    <div className="flex min-h-svh w-full">
      <Sidebar className={cn("w-64", className)}>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => onSearchModalOpenChange(true)}
                  >
                    <Search className="h-4 w-4" />
                    <span>Search...</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={withMobileClose(onHomeClick)}>
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {(devices.length > 0 || canRegisterDevice) && (
            <SidebarGroup>
              <SidebarGroupLabel>Devices</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {devices.map((device) => (
                    <SidebarMenuItem key={device.id}>
                      <SidebarMenuButton
                        onClick={withMobileClose(() => onDeviceClick(device.id))}
                      >
                        <Lightbulb className="h-4 w-4" />
                        <span>{device.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {/* Register/Invite open dialogs — don't close the sidebar so the dialog overlays naturally */}
                  {canRegisterDevice && (
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={onRegisterClick}>
                        <Plus className="h-4 w-4" />
                        <span>Register Device</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

        </SidebarContent>

        {(canAccessSettings || canInviteToWorkspace) && (
          <SidebarFooter className="pb-4">
            <SidebarMenu>
              {canAccessSettings && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={withMobileClose(onSettingsClick)}>
                    <Settings className="h-4 w-4" />
                    <span>Workspace settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Invite opens a dialog — don't close sidebar (same as Register Device above) */}
              {canInviteToWorkspace && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={onInviteClick}>
                    <UserPlus className="h-4 w-4" />
                    <span>Invite to workspace</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarFooter>
        )}

        <Dialog
          open={isSearchModalOpen}
          onOpenChange={onSearchModalOpenChange}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="sr-only">Search</DialogTitle>
            </DialogHeader>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Type a command or search..."
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  onSearchQueryChange(q);
                  onSearch?.(q);
                }}
                className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((result) => (
                    <Button
                      key={result.id}
                      variant="ghost"
                      className="w-full justify-start gap-3 h-auto p-3 text-left"
                      onClick={() => {
                        result.onClick?.();
                        onSearchModalOpenChange(false);
                      }}
                    >
                      {result.icon && (
                        <result.icon className="h-4 w-4 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {result.title}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {result.content}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="text-sm text-muted-foreground px-2 py-1">
                  No results found for &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="text-sm text-muted-foreground px-2 py-1">
                  Start typing to search...
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </Sidebar>
      {children}
    </div>
  );
}
