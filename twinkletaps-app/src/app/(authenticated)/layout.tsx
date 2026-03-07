import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/providers/auth-provider";
import { UserProfileProvider } from "@/components/providers/user-profile-provider";
import { createClient } from "@/lib/supabase/server";
import { getProfileSummary } from "@/lib/services";

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default async function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/auth");
  }

  const profile = await getProfileSummary(user.id);

  return (
    <AuthProvider>
      <UserProfileProvider
        profile={{
          id: user.id,
          name: profile?.fullName ?? user.email ?? "",
          email: user.email ?? "",
          avatar: profile?.avatarUrl ?? undefined,
        }}
      >
        {children}
      </UserProfileProvider>
    </AuthProvider>
  );
}
