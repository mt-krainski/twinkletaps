"use client";

import { useState } from "react";
import { MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WorkspaceMember {
  userId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  deviceCount: number;
}

export interface WorkspaceSettingsViewProps {
  workspaceName: string;
  members: WorkspaceMember[];
  isAdmin: boolean;
  onUpdateName: (name: string) => Promise<void>;
  onChangeMemberRole: (userId: string, role: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  currentUserId: string;
}

export function WorkspaceSettingsView({
  workspaceName,
  members,
  isAdmin,
  onUpdateName,
  onChangeMemberRole,
  onRemoveMember,
  currentUserId,
}: WorkspaceSettingsViewProps) {
  const [name, setName] = useState(workspaceName);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSaveName() {
    setIsSaving(true);
    try {
      await onUpdateName(name);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Name</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Update your workspace name."
              : "Only admins can change the workspace name."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>
          {isAdmin && (
            <Button
              onClick={handleSaveName}
              disabled={isSaving || name === workspaceName}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this
            workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                isAdmin={isAdmin}
                isSelf={member.userId === currentUserId}
                onChangeMemberRole={onChangeMemberRole}
                onRemoveMember={onRemoveMember}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MemberRow({
  member,
  isAdmin,
  isSelf,
  onChangeMemberRole,
  onRemoveMember,
}: {
  member: WorkspaceMember;
  isAdmin: boolean;
  isSelf: boolean;
  onChangeMemberRole: (userId: string, role: string) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
}) {
  const showActions = isAdmin && !isSelf;

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{member.name}</p>
          {member.username && (
            <p className="text-xs text-muted-foreground">@{member.username}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{member.role}</span>

        {showActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${member.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {member.role !== "admin" && (
                <DropdownMenuItem
                  onClick={() => onChangeMemberRole(member.userId, "admin")}
                >
                  Make admin
                </DropdownMenuItem>
              )}
              {member.role !== "member" && (
                <DropdownMenuItem
                  onClick={() => onChangeMemberRole(member.userId, "member")}
                >
                  Make member
                </DropdownMenuItem>
              )}
              {member.role !== "guest" && (
                <DropdownMenuItem
                  onClick={() => onChangeMemberRole(member.userId, "guest")}
                >
                  Make guest
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRemoveMember(member.userId)}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
