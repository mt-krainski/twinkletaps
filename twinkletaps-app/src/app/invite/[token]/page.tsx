import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvitationByToken } from "@/lib/services/invitation";
import { AcceptInvite } from "./accept-invite";
import { Logo } from "@/components/app/Logo";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  // Auth check first — don't reveal invitation validity to unauthenticated users
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?redirect=/invite/${token}`);
  }

  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="p-6">
          <Logo />
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-sm w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">
              Invitation not found
            </h1>
            <p className="text-muted-foreground">
              This invitation link is invalid, expired, or has already been
              used.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-6">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-6">
        <AcceptInvite
          token={token}
          workspaceName={invitation.workspace.name}
          deviceName={invitation.device?.name ?? null}
          role={invitation.role}
          type={invitation.type as "workspace" | "device"}
          inviterName={
            invitation.inviter.fullName ??
            invitation.inviter.username ??
            "Someone"
          }
        />
      </main>
    </div>
  );
}
