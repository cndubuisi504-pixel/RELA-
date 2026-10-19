"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function clean(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

async function requireUser(next = "/settings") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${next}`);
  return { supabase, user };
}

const NIGERIAN_PHONE = /^(\+?234|0)[789][01]\d{8}$/;

/** Business identity + bank + defaults — everything the documents show. */
export async function saveBusinessSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, user } = await requireUser();

  const name = clean(formData.get("name"));
  const address = clean(formData.get("address"));
  const phone = clean(formData.get("phone")).replace(/[\s-]/g, "");
  const email = clean(formData.get("email")).toLowerCase();
  const defaultMode = clean(formData.get("default_mode"));
  const defaultTheme = clean(formData.get("default_theme")) || "classic";
  const bankName = clean(formData.get("bank_name"));
  const bankAccountName = clean(formData.get("bank_account_name"));
  const bankAccountNumber = clean(formData.get("bank_account_number")).replace(/\s/g, "");

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your business name as customers know it.";
  if (address.length < 5) fieldErrors.address = "Add the address customers should see on documents.";
  if (!NIGERIAN_PHONE.test(phone)) fieldErrors.phone = "Use a Nigerian number, e.g. 0803 123 4567.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "That email doesn’t look right.";
  if (bankAccountNumber && !/^\d{10}$/.test(bankAccountNumber)) {
    fieldErrors.bank_account_number = "NUBAN account numbers are 10 digits.";
  }
  if (bankAccountNumber && (!bankName || !bankAccountName)) {
    fieldErrors.bank_name = "Add the bank name and account name too.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const normalizedPhone = phone.startsWith("+234")
    ? phone
    : phone.startsWith("234")
      ? `+${phone}`
      : `+234${phone.slice(1)}`;

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      address,
      phone: normalizedPhone,
      email: email || null,
      default_mode: defaultMode === "service" ? "service" : "product",
      default_theme: ["classic", "bold", "minimal"].includes(defaultTheme) ? defaultTheme : "classic",
      bank_name: bankName || null,
      bank_account_name: bankAccountName || null,
      bank_account_number: bankAccountNumber || null,
    })
    .eq("owner_id", user.id);

  if (error) {
    console.error("saveBusinessSettings", error.message);
    return { error: "We couldn’t save those changes. Check your connection and try again." };
  }

  // Documents, invoices and the print sheets all read these fields.
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved — new documents will use these details." };
}

/** Login email and/or password. Email changes confirm via Supabase before taking effect. */
export async function saveLogin(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { supabase, user } = await requireUser();

  const email = clean(formData.get("login_email")).toLowerCase();
  const password = clean(formData.get("password"));
  const confirm = clean(formData.get("password_confirm"));

  if (!email && !password) return { error: "Nothing to change — enter a new email or a new password." };
  if (email && email.toLowerCase() === (user.email ?? "").toLowerCase() && !password) {
    return { error: "That’s already your sign-in email." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { fieldErrors: { login_email: "That email doesn’t look right." } };
  }
  if (password) {
    if (password.length < 8) {
      return { fieldErrors: { password: "Use at least 8 characters." } };
    }
    if (password !== confirm) {
      return { fieldErrors: { password_confirm: "These don’t match — type it once more." } };
    }
  }

  const { error } = await supabase.auth.updateUser({
    ...(email ? { email } : {}),
    ...(password ? { password } : {}),
  });
  if (error) {
    console.error("saveLogin", error.message);
    return { error: "We couldn’t update your login. Try again in a moment." };
  }

  return {
    ok: true,
    message: email
      ? `Check ${email} for a confirmation link — the change completes when you tap it.`
      : "Password updated. You stay signed in on this device.",
  };
}
