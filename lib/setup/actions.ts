"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SetupState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
} | null;

function clean(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup/business");
  return { supabase, user };
}

const NIGERIAN_PHONE = /^(\+?234|0)[789][01]\d{8}$/;

export async function saveBusiness(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const { supabase, user } = await requireUser();

  const name = clean(formData.get("name"));
  const address = clean(formData.get("address"));
  const phone = clean(formData.get("phone")).replace(/[\s-]/g, "");
  const email = clean(formData.get("email")).toLowerCase();
  const registration = clean(formData.get("registration_info"));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Enter your business name as customers know it.";
  if (address.length < 5) fieldErrors.address = "Add the address customers should see on documents.";
  if (!NIGERIAN_PHONE.test(phone)) fieldErrors.phone = "Use a Nigerian number, e.g. 0803 123 4567.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "That email doesn’t look right.";

  const values = { name, address, phone, email, registration_info: registration };
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const normalizedPhone = phone.startsWith("+234")
    ? phone
    : phone.startsWith("234")
      ? `+${phone}`
      : `+234${phone.slice(1)}`;

  const { error } = await supabase.from("businesses").upsert(
    {
      owner_id: user.id,
      name,
      address,
      phone: normalizedPhone,
      email: email || null,
      registration_info: registration || null,
    },
    { onConflict: "owner_id" },
  );

  if (error) {
    console.error("saveBusiness", error.message);
    return { error: "We couldn’t save your business details. Check your connection and try again.", values };
  }

  revalidatePath("/setup", "layout");
  redirect("/setup/branding");
}

export async function saveBranding(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const { supabase, user } = await requireUser();

  const logoUrl = clean(formData.get("logo_url"));
  const signatureUrl = clean(formData.get("signature_url"));
  const brandPrimary = clean(formData.get("brand_primary"));
  const brandSecondary = clean(formData.get("brand_secondary"));
  const theme = clean(formData.get("default_theme")) || "classic";

  const patch: Record<string, string | null> = {
    default_theme: ["classic", "bold", "minimal"].includes(theme) ? theme : "classic",
  };
  if (logoUrl) patch.logo_url = logoUrl;
  if (signatureUrl) patch.signature_url = signatureUrl;
  if (brandPrimary) patch.brand_primary = brandPrimary;
  if (brandSecondary) patch.brand_secondary = brandSecondary;

  const { error } = await supabase.from("businesses").update(patch).eq("owner_id", user.id);

  if (error) {
    console.error("saveBranding", error.message);
    return { error: "We couldn’t save your branding. Try again in a moment." };
  }

  revalidatePath("/setup", "layout");
  redirect("/setup/preferences");
}

export async function savePreferences(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const { supabase, user } = await requireUser();

  const mode = clean(formData.get("default_mode")) === "service" ? "service" : "product";
  const theme = clean(formData.get("default_theme")) || "classic";
  const bankName = clean(formData.get("bank_name"));
  const accountName = clean(formData.get("bank_account_name"));
  const accountNumber = clean(formData.get("bank_account_number"));

  const values = {
    bank_name: bankName,
    bank_account_name: accountName,
    bank_account_number: accountNumber,
  };
  if (accountNumber && !/^\d{10}$/.test(accountNumber)) {
    return { fieldErrors: { bank_account_number: "Nigerian account numbers are 10 digits." }, values };
  }
  if (accountNumber && (!bankName || !accountName)) {
    return {
      fieldErrors: {
        bank_name: !bankName ? "Add the bank name with the account number." : "",
        bank_account_name: !accountName ? "Add the account name with the account number." : "",
      },
      values,
    };
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      default_mode: mode,
      default_theme: ["classic", "bold", "minimal"].includes(theme) ? theme : "classic",
      bank_name: bankName || null,
      bank_account_name: accountName || null,
      bank_account_number: accountNumber || null,
      setup_completed_at: new Date().toISOString(),
    })
    .eq("owner_id", user.id);

  if (error) {
    console.error("savePreferences", error.message);
    return { error: "We couldn’t save your preferences. Try again in a moment.", values };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Called by the branding step or Settings after the file lands in storage or when removed. */
export async function saveUploadedAsset(
  kind: "logo" | "signature",
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  // Only accept files this user actually owns in our branding bucket. The browser
  // uploads to storage directly, so the URL is the only thing we can trust-check.
  const ownedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/${user.id}/`;
  if (url && !url.startsWith(ownedPrefix)) {
    return { ok: false, error: "That upload couldn’t be verified. Please try again." };
  }

  const column = kind === "logo" ? "logo_url" : "signature_url";
  const { error } = await supabase
    .from("businesses")
    .update({ [column]: url || null })
    .eq("owner_id", user.id);

  if (error) return { ok: false, error: "Uploaded, but we couldn’t attach it to your business." };
  revalidatePath("/setup", "layout");
  revalidatePath("/settings", "page");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Lets new users skip the setup wizard and explore the dashboard immediately.
 * Ensures a valid baseline business record exists so the dashboard renders cleanly.
 */
export async function skipSetupToExplore(): Promise<void> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const defaultName = profile?.full_name?.trim() || user.email?.split("@")[0] || "My Business";

  const { data: existing } = await supabase
    .from("businesses")
    .select("id, name, setup_completed_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("businesses").insert({
      owner_id: user.id,
      name: defaultName,
      address: "Nigeria",
      phone: "+2348000000000",
      email: user.email || null,
      setup_completed_at: new Date().toISOString(),
    });
  } else if (!existing.setup_completed_at) {
    await supabase
      .from("businesses")
      .update({ setup_completed_at: new Date().toISOString() })
      .eq("owner_id", user.id);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

