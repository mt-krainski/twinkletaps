"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined, // This ensures we get a code, not a link
      },
    });

    if (error) {
      console.error("sendOtp failed", { email, error });
      redirect("/error");
    }
  } catch (unknownError) {
    console.error("sendOtp threw", { email, error: unknownError });
    redirect("/error");
  }

  redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;

  try {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      console.error("verifyOtp failed", { email, error });
      redirect("/error");
    }
  } catch (unknownError) {
    console.error("verifyOtp threw", { email, error: unknownError });
    redirect("/error");
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function resendOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined, // This ensures we get a code, not a link
      },
    });

    if (error) {
      console.error("resendOtp failed", { email, error });
      redirect("/error");
    }
  } catch (unknownError) {
    console.error("resendOtp threw", { email, error: unknownError });
    redirect("/error");
  }

  redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}&resent=true`);
}
