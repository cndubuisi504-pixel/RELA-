"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export type AuthState = {
  error?: string;
  notice?: string;
  values?: { email?: string; fullName?: string };
} | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = clean(formData.get("full_name"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));

  const values = { email, fullName };

  if (fullName.length < 2) return { error: "Enter your name so we can address you properly.", values };
  if (!EMAIL_RE.test(email)) return { error: "That email address doesn’t look right.", values };
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${site.url}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { error: "An account with that email already exists. Try logging in instead.", values };
    }
    if (error.message.toLowerCase().includes("rate")) {
      return { error: "Too many attempts. Please wait a minute and try again.", values };
    }
    return { error: "We couldn’t create your account. Check your connection and try again.", values };
  }

  // Email confirmation on: no session yet.
  if (!data.session) {
    return {
      notice: `Almost there. We sent a confirmation link to ${email} — open it to finish setting up.`,
    };
  }

  redirect("/setup/business");
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));
  const next = clean(formData.get("next")) || "/dashboard";

  const values = { email };

  if (!EMAIL_RE.test(email) || !password) {
    return { error: "Enter your email and password.", values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("invalid")) {
      return { error: "That email and password don’t match. Check them and try again.", values };
    }
    if (error.message.toLowerCase().includes("confirm")) {
      return { error: "Confirm your email first — check your inbox for the link we sent.", values };
    }
    return { error: "We couldn’t sign you in just now. Check your connection and retry.", values };
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = clean(formData.get("email")).toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter the email address on your account." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site.url}/auth/callback?next=/reset-password/new`,
  });

  // Same message whether or not the address exists — no account enumeration.
  return {
    notice: "If that email is on an account, a reset link is on its way. It expires in one hour.",
  };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = clean(formData.get("password"));
  if (password.length < 8) return { error: "Use at least 8 characters for your new password." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "We couldn’t update your password. Request a fresh link and try again." };

  redirect("/login?reset=1");
}
