"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function isSafeRedirect(url: string | null): url is string {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//");
}

export async function sendOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const redirectParam = formData.get("redirect") as string | null;

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

  const verifyUrl = new URL("/auth/verify-otp", "http://localhost");
  verifyUrl.searchParams.set("email", email);
  if (isSafeRedirect(redirectParam)) {
    verifyUrl.searchParams.set("redirect", redirectParam);
  }
  redirect(verifyUrl.pathname + verifyUrl.search);
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  const redirectParam = formData.get("redirect") as string | null;

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
  redirect(isSafeRedirect(redirectParam) ? redirectParam : "/account");
}

export async function resendOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const redirectParam = formData.get("redirect") as string | null;

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

  const verifyUrl = new URL("/auth/verify-otp", "http://localhost");
  verifyUrl.searchParams.set("email", email);
  verifyUrl.searchParams.set("resent", "true");
  if (isSafeRedirect(redirectParam)) {
    verifyUrl.searchParams.set("redirect", redirectParam);
  }
  redirect(verifyUrl.pathname + verifyUrl.search);
}
