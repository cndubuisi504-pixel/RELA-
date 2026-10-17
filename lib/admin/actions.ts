"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Gate: the founder's admin email, or any profile already marked role=admin. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };

  const [{ data: profile }, adminEmail] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    Promise.resolve((process.env.ADMIN_EMAIL ?? "").toLowerCase()),
  ]);
  const isAdmin =
    profile?.role === "admin" || (!!adminEmail && (user.email ?? "").toLowerCase() === adminEmail);
  return isAdmin
    ? { ok: true as const, user }
    : { ok: false as const, reason: "forbidden" as const };
}

const ACCEPTED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024;

export type SaveLogoState = { ok: boolean; error?: string } | null;

export async function saveSiteLogo(
  _prev: SaveLogoState,
  formData: FormData,
): Promise<SaveLogoState> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "This area is for the Rela team." };

  // Duck-type: server-action FormData files can cross File realms on some runtimes.
  const file = formData.get("logo") as File | null;
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
    return { ok: false, error: "Choose an image first." };
  }
  const ext = ACCEPTED[file.type];
  if (!ext) return { ok: false, error: "Use a PNG, JPG or WebP file." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Keep the logo under 2 MB." };

  const admin = createAdminClient();

  // Browsers upload via a user session, but the site logo belongs to Rela, not a
  // user's folder — so it travels through the service role into `site/…`.
  const path = `site/logo-${Date.now()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("branding")
    .upload(path, file, { cacheControl: "3600", contentType: file.type });
  if (upErr) return { ok: false, error: "The upload didn’t go through. Try again." };

  const {
    data: { publicUrl },
  } = admin.storage.from("branding").getPublicUrl(path);

  const { data: before } = await admin
    .from("site_settings")
    .select("logo_url")
    .eq("id", true)
    .maybeSingle();

  const { error: saveErr } = await admin
    .from("site_settings")
    .upsert(
      { id: true, logo_url: publicUrl, updated_at: new Date().toISOString(), updated_by: gate.user.id },
      { onConflict: "id" },
    );
  if (saveErr) return { ok: false, error: "Uploaded, but we couldn’t save the setting." };

  // Tidy the previous file so the bucket doesn't fill with old logos.
  const prev = before?.logo_url ?? "";
  const marker = "/storage/v1/object/public/branding/site/";
  if (prev.includes(marker)) {
    const prevPath = prev.slice(prev.indexOf(marker) + marker.length);
    if (prevPath.startsWith("site/")) {
      await admin.storage.from("branding").remove([`site/${prevPath}`]);
    }
  }

  revalidateTag("site-settings", "max");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeSiteLogo(): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: "This area is for the Rela team." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .update({ logo_url: null, updated_at: new Date().toISOString(), updated_by: gate.user.id })
    .eq("id", true);
  if (error) return { ok: false, error: "We couldn’t clear the logo. Try again." };

  revalidateTag("site-settings", "max");
  revalidatePath("/", "layout");
  void data;
  return { ok: true };
}

/** Small launch metrics for the admin home. Service role — never shipped to clients. */
export async function getAdminStats(): Promise<{
  businesses: number;
  users: number;
  documents: number;
} | null> {
  const gate = await requireAdmin();
  if (!gate.ok) return null;

  const admin = createAdminClient();
  const [b, d, u] = await Promise.all([
    admin.from("businesses").select("id", { count: "exact", head: true }),
    admin.from("documents").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }),
  ]);
  return { businesses: b.count ?? 0, documents: d.count ?? 0, users: u.count ?? 0 };
}
