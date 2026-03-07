import { createClient } from "@/lib/supabase/server";

/**
 * Get the authenticated user from the server-side Supabase client.
 * Use in server components/actions under (authenticated)/ where the
 * layout already guarantees an authenticated session.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user!;
}
