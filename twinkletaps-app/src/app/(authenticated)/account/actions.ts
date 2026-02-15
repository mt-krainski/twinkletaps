"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile, updateProfile, type ProfileData } from "@/lib/services";
import { revalidatePath } from "next/cache";

export async function getProfileAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    return { error: "Profile not found" };
  }

  return { data: profile };
}

export async function updateProfileAction(data: Partial<ProfileData>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const profile = await updateProfile(user.id, data);
    revalidatePath("/account");
    return { data: profile };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile" };
  }
}

