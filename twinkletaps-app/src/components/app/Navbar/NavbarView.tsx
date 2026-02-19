"use client";

import Image from "next/image";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
          <Logo />

          {workspaces.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="truncate">{selectedWorkspace?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[200px]">
                {workspaces.map((workspace) => (
                  <DropdownMenuItem
                    key={workspace.id}
                    onClick={() => switchWorkspace(workspace.id)}
                  >
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{workspace.name}</span>
                  </DropdownMenuItem>
                ))}
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
                className="flex items-center gap-2"
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
                <span className="hidden sm:inline-block">{profile.name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
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
