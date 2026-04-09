"use client";

import Image from "next/image";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Loader2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { UserProfile } from "@/components/providers/user-profile-provider";
import type { WorkspaceInfo } from "@/components/providers/workspace-provider";
import { Logo } from "@/components/app/Logo";

export interface NavbarViewProps {
  className?: string;
  profile: UserProfile;
  workspaces: WorkspaceInfo[];
  selectedWorkspace: WorkspaceInfo | undefined;
  switchWorkspace: (workspaceId: string) => void;
  isSigningOut: boolean;
  signOut: () => Promise<void>;
  navigateToAccount: () => void;
  navigateToSettings: () => void;
  onCreateWorkspace?: () => void;
}

export function NavbarView({
  className,
  profile,
  workspaces,
  selectedWorkspace,
  switchWorkspace,
  isSigningOut,
  signOut,
  navigateToAccount,
  navigateToSettings,
  onCreateWorkspace,
}: NavbarViewProps) {
  return (
    <>
      <div
        className={cn(
          "flex h-16 items-center justify-between border-b bg-background px-4",
          className,
        )}
      >
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <Logo compact />

          {workspaces.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="chromatic-ignore max-w-[120px] truncate sm:max-w-none">
                    {selectedWorkspace?.name}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px]">
                {workspaces.map((workspace) => (
                  <DropdownMenuCheckboxItem
                    key={workspace.id}
                    checked={workspace.id === selectedWorkspace?.id}
                    onClick={() => switchWorkspace(workspace.id)}
                  >
                    <span className="chromatic-ignore truncate">{workspace.name}</span>
                  </DropdownMenuCheckboxItem>
                ))}
                {onCreateWorkspace && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onCreateWorkspace}>
                      <Plus className="h-4 w-4" />
                      Create workspace
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="chromatic-ignore flex items-center gap-2"
              >
                {profile.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={profile.name}
                    width={24}
                    height={24}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="chromatic-ignore hidden sm:inline-block">{profile.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuLabel>
                <div className="chromatic-ignore flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={navigateToAccount}>
                <User className="h-4 w-4" />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={navigateToSettings}>
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isSigningOut && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center gap-2 bg-background/80 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing out&hellip;
        </div>
      )}
    </>
  );
}
