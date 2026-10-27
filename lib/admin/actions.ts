"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBusinessProfileCompletion } from "@/lib/business/guard";
import type {
  AdminOverviewMetrics,
  AdminBusiness,
  AdminUser,
  AdminSubscription,
  AdminSubscriptionEvent,
  AdminApiKey,
  AdminApiReceipt,
  TimelinePoint,
  AdminFullData,
} from "./types";

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

/** Full platform analytics & data for the admin command center. */
export async function getAdminFullData(): Promise<AdminFullData | null> {
  const gate = await requireAdmin();
  if (!gate.ok) return null;

  const admin = createAdminClient();

  const [
    { data: businessesRaw },
    { data: profilesRaw },
    { data: documentsRaw },
    { data: subscriptionsRaw },
    { data: subEventsRaw },
    { data: apiKeysRaw },
    { data: apiReceiptsRaw },
    usersRes,
  ] = await Promise.all([
    admin.from("businesses").select("*").order("created_at", { ascending: false }),
    admin.from("profiles").select("*"),
    admin
      .from("documents")
      .select(
        "id, business_id, document_type, document_number, customer_name, currency, total_kobo, amount_paid_kobo, status, created_at",
      )
      .order("created_at", { ascending: false }),
    admin.from("subscriptions").select("*").order("created_at", { ascending: false }),
    admin.from("subscription_events").select("*").order("created_at", { ascending: false }),
    admin.from("api_keys").select("*").order("created_at", { ascending: false }),
    admin
      .from("api_receipts")
      .select(
        "id, receipt_number, order_number, business_name, customer_name, customer_email, total_amount, currency, is_test, receipt_status, created_at, api_key_id",
      )
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers(),
  ]);

  const businesses = businessesRaw || [];
  const profiles = profilesRaw || [];
  const documents = documentsRaw || [];
  const subscriptions = subscriptionsRaw || [];
  const subEvents = subEventsRaw || [];
  const apiKeys = apiKeysRaw || [];
  const apiReceipts = apiReceiptsRaw || [];
  const users = usersRes.data?.users || [];

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const businessMap = new Map(businesses.map((b) => [b.id, b]));
  const apiKeyMap = new Map(apiKeys.map((k) => [k.id, k.name]));

  // Documents aggregated by business
  const docsByBusiness = new Map<string, { count: number; volumeKobo: number; collectedKobo: number }>();
  for (const doc of documents) {
    if (!docsByBusiness.has(doc.business_id)) {
      docsByBusiness.set(doc.business_id, { count: 0, volumeKobo: 0, collectedKobo: 0 });
    }
    const stat = docsByBusiness.get(doc.business_id)!;
    stat.count++;
    stat.volumeKobo += Number(doc.total_kobo) || 0;
    stat.collectedKobo += Number(doc.amount_paid_kobo) || 0;
  }

  // API Receipts count by key
  const receiptsByKey = new Map<string, number>();
  for (const r of apiReceipts) {
    if (r.api_key_id) {
      receiptsByKey.set(r.api_key_id, (receiptsByKey.get(r.api_key_id) || 0) + 1);
    }
  }

  // Admin Businesses List
  const adminBusinesses: AdminBusiness[] = businesses.map((b) => {
    const ownerProfile = profileMap.get(b.owner_id);
    const ownerUser = userMap.get(b.owner_id);
    const docStat = docsByBusiness.get(b.id) || { count: 0, volumeKobo: 0, collectedKobo: 0 };
    const check = checkBusinessProfileCompletion(b);
    return {
      id: b.id,
      name: b.name,
      ownerId: b.owner_id,
      ownerName: ownerProfile?.full_name || "—",
      ownerEmail: ownerUser?.email || b.email || "—",
      phone: b.phone || "—",
      address: b.address || "—",
      email: b.email,
      bankName: b.bank_name,
      bankAccountName: b.bank_account_name,
      bankAccountNumber: b.bank_account_number,
      isComplete: check.isComplete,
      missingFields: check.missingFields,
      plan: ownerProfile?.plan || "free",
      subscriptionStatus: ownerProfile?.subscription_status || "inactive",
      docCount: docStat.count,
      totalVolumeKobo: docStat.volumeKobo,
      totalCollectedKobo: docStat.collectedKobo,
      defaultCurrency: b.default_currency || "NGN",
      defaultMode: b.default_mode || "product",
      createdAt: b.created_at,
      setupCompletedAt: b.setup_completed_at,
      lastSignInAt: ownerUser?.last_sign_in_at || null,
    };
  });

  // Admin Users List
  const adminUsers: AdminUser[] = users.map((u) => {
    const p = profileMap.get(u.id);
    const b = businesses.find((biz) => biz.owner_id === u.id);
    return {
      id: u.id,
      email: u.email ?? "—",
      fullName: p?.full_name ?? "—",
      role: p?.role ?? "user",
      plan: p?.plan ?? "free",
      subscriptionStatus: p?.subscription_status ?? "inactive",
      hasBusiness: !!b,
      businessName: b?.name ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
    };
  });

  // Admin Subscriptions List
  const adminSubscriptions: AdminSubscription[] = subscriptions.map((s) => {
    const biz = businessMap.get(s.business_id);
    const user = userMap.get(s.profile_id);
    return {
      id: s.id,
      businessId: s.business_id,
      businessName: biz?.name ?? "—",
      ownerEmail: user?.email ?? "—",
      plan: s.plan,
      status: s.status,
      amountKobo: Number(s.amount_kobo) || 250000,
      currency: s.currency ?? "NGN",
      provider: s.provider ?? "paystack",
      providerReference: s.provider_reference ?? "—",
      startedAt: s.started_at,
      endsAt: s.ends_at,
      lastVerifiedAt: s.last_verified_at,
      createdAt: s.created_at,
    };
  });

  // Admin Subscription Events List
  const adminSubscriptionEvents: AdminSubscriptionEvent[] = subEvents.map((e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = e.payload as any;
    const customerEmail = payload?.data?.customer?.email ?? null;
    const amountKobo = payload?.data?.amount ?? null;
    return {
      id: e.id,
      eventType: e.event_type,
      reference: e.reference,
      status: e.status,
      processingError: e.processing_error,
      customerEmail,
      amountKobo,
      createdAt: e.created_at,
    };
  });

  // Admin API Keys List
  const adminApiKeys: AdminApiKey[] = apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key_prefix,
    isTest: !!k.is_test,
    status: k.status ?? "active",
    rateLimitPerMinute: k.rate_limit_per_minute ?? 300,
    lastUsedAt: k.last_used_at,
    createdAt: k.created_at,
    receiptsCount: receiptsByKey.get(k.id) || 0,
  }));

  // Admin API Receipts List
  const adminApiReceipts: AdminApiReceipt[] = apiReceipts.map((r) => ({
    id: r.id,
    receiptNumber: r.receipt_number,
    orderNumber: r.order_number,
    businessName: r.business_name,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    totalAmount: Number(r.total_amount) || 0,
    currency: r.currency || "NGN",
    isTest: !!r.is_test,
    status: r.receipt_status || "ready",
    keyName: apiKeyMap.get(r.api_key_id) || "—",
    createdAt: r.created_at,
  }));

  // Timeline (14 days up to today)
  const timelineMap = new Map<string, TimelinePoint>();
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const isoDate = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
    timelineMap.set(isoDate, {
      date: isoDate,
      label,
      signups: 0,
      businesses: 0,
      documents: 0,
      apiReceipts: 0,
      volume: 0,
      collected: 0,
    });
  }

  for (const u of users) {
    const key = u.created_at?.slice(0, 10);
    if (key && timelineMap.has(key)) {
      timelineMap.get(key)!.signups++;
    }
  }

  for (const b of businesses) {
    const key = b.created_at?.slice(0, 10);
    if (key && timelineMap.has(key)) {
      timelineMap.get(key)!.businesses++;
    }
  }

  for (const d of documents) {
    const key = d.created_at?.slice(0, 10);
    if (key && timelineMap.has(key)) {
      const pt = timelineMap.get(key)!;
      pt.documents++;
      pt.volume += Math.round((Number(d.total_kobo) || 0) / 100);
      pt.collected += Math.round((Number(d.amount_paid_kobo) || 0) / 100);
    }
  }

  for (const r of apiReceipts) {
    const key = r.created_at?.slice(0, 10);
    if (key && timelineMap.has(key)) {
      const pt = timelineMap.get(key)!;
      pt.apiReceipts++;
      const amt = Number(r.total_amount) || 0;
      pt.volume += amt;
      pt.collected += amt;
    }
  }

  const timeline = Array.from(timelineMap.values());

  const completedBizCount = adminBusinesses.filter((b) => b.isComplete).length;
  const activeSubs = adminSubscriptions.filter((s) => s.status === "active").length;
  const totalSubRevenueKobo = adminSubscriptions
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + s.amountKobo, 0);

  const totalInvoices = documents.filter((d) => d.document_type === "invoice").length;
  const totalReceipts = documents.filter((d) => d.document_type === "receipt").length;
  const totalQuotations = documents.filter((d) => d.document_type === "quotation").length;

  const totalDocVolumeKobo = documents.reduce((sum, d) => sum + (Number(d.total_kobo) || 0), 0);
  const totalDocCollectedKobo = documents.reduce((sum, d) => sum + (Number(d.amount_paid_kobo) || 0), 0);
  const totalApiVolume = apiReceipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

  const metrics: AdminOverviewMetrics = {
    totalUsers: users.length,
    totalBusinesses: businesses.length,
    completedBusinesses: completedBizCount,
    incompleteBusinesses: businesses.length - completedBizCount,
    activeSubscriptions: activeSubs,
    totalSubscriptionRevenueKobo: totalSubRevenueKobo,
    mrrKobo: activeSubs * 250000,
    totalDocuments: documents.length,
    totalInvoices,
    totalReceipts,
    totalQuotations,
    totalDocumentVolumeKobo: totalDocVolumeKobo,
    totalDocumentCollectedKobo: totalDocCollectedKobo,
    totalApiReceipts: apiReceipts.length,
    totalApiVolume,
    activeApiKeys: adminApiKeys.filter((k) => k.status === "active").length,
  };

  return {
    metrics,
    timeline,
    businesses: adminBusinesses,
    users: adminUsers,
    subscriptions: adminSubscriptions,
    subscriptionEvents: adminSubscriptionEvents,
    apiKeys: adminApiKeys,
    apiReceipts: adminApiReceipts,
  };
}
