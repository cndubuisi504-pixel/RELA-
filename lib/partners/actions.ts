"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getServiceSupabase, hashApiKey } from "@/lib/api/auth";
import type {
  Agency,
  AgencyMember,
  AgencyWallet,
  ClientBusiness,
  Project,
  ProjectApiKey,
  WalletTransaction,
  ApiRequestLog,
  AgencyDashboardStats,
} from "@/lib/partners/types";

/**
 * Validates that the current user is authenticated and belongs to an agency.
 */
export async function requireAgency(): Promise<{
  supabase: ReturnType<typeof getServiceSupabase>;
  userId: string;
  agency: Agency;
  member: AgencyMember;
  wallet: AgencyWallet;
}> {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/partners/login");
  }

  const supabase = getServiceSupabase();

  // Find agency membership
  const { data: member, error: memberErr } = await supabase
    .from("agency_members")
    .select("id, agency_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (memberErr || !member) {
    redirect("/partners/register");
  }

  // Find agency details
  const { data: agencyRaw, error: agencyErr } = await supabase
    .from("agencies")
    .select("*")
    .eq("id", member.agency_id)
    .single();

  if (agencyErr || !agencyRaw) {
    redirect("/partners/register");
  }

  // Find or create agency wallet
  let { data: walletRaw } = await supabase
    .from("wallets")
    .select("*")
    .eq("agency_id", agencyRaw.id)
    .maybeSingle();

  if (!walletRaw) {
    const { data: newWallet } = await supabase
      .from("wallets")
      .insert({
        agency_id: agencyRaw.id,
        balance_kobo: 0,
        currency: "NGN",
      })
      .select("*")
      .single();
    walletRaw = newWallet;
  }

  const agency: Agency = {
    id: agencyRaw.id,
    name: agencyRaw.name,
    slug: agencyRaw.slug,
    email: agencyRaw.email,
    phone: agencyRaw.phone,
    website: agencyRaw.website,
    logoUrl: agencyRaw.logo_url,
    status: agencyRaw.status,
    lowBalanceThresholdKobo: Number(agencyRaw.low_balance_threshold_kobo) || 500000,
    createdAt: agencyRaw.created_at,
    updatedAt: agencyRaw.updated_at,
  };

  const wallet: AgencyWallet = {
    id: walletRaw?.id || "",
    agencyId: agencyRaw.id,
    balanceKobo: Number(walletRaw?.balance_kobo) || 0,
    currency: walletRaw?.currency || "NGN",
    totalFundedKobo: Number(walletRaw?.total_funded_kobo) || 0,
    totalSpentKobo: Number(walletRaw?.total_spent_kobo) || 0,
    createdAt: walletRaw?.created_at || new Date().toISOString(),
    updatedAt: walletRaw?.updated_at || new Date().toISOString(),
  };

  const agencyMember: AgencyMember = {
    id: member.id,
    agencyId: member.agency_id,
    userId: user.id,
    role: member.role,
    createdAt: member.created_at,
  };

  return { supabase, userId: user.id, agency, member: agencyMember, wallet };
}

/**
 * Registers a new agency and associates the authenticated user as owner.
 */
export async function registerAgencyAction(formData: FormData): Promise<void> {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/partners/login");
  }

  const name = String(formData.get("agency_name") || "").trim();
  const email = String(formData.get("agency_email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const website = String(formData.get("website") || "").trim();

  if (name.length < 2) {
    throw new Error("Agency name must be at least 2 characters.");
  }
  if (!email.includes("@")) {
    throw new Error("Valid contact email is required.");
  }

  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

  const supabase = getServiceSupabase();

  // Create Agency
  const { data: agency, error: agencyErr } = await supabase
    .from("agencies")
    .insert({
      name,
      slug,
      email,
      phone: phone || null,
      website: website || null,
      status: "active",
      low_balance_threshold_kobo: 500000, // ₦5,000
    })
    .select("id")
    .single();

  if (agencyErr || !agency) {
    throw new Error(`Failed to create agency: ${agencyErr?.message || "Unknown error"}`);
  }

  // Add Member as Owner
  const { error: memberErr } = await supabase.from("agency_members").insert({
    agency_id: agency.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberErr) {
    throw new Error(`Failed to register agency ownership: ${memberErr.message}`);
  }

  // Create initial wallet
  await supabase.from("wallets").insert({
    agency_id: agency.id,
    balance_kobo: 0,
    currency: "NGN",
  });

  revalidatePath("/partners");
  redirect("/partners/dashboard");
}

/**
 * Retrieves aggregate overview data for the Agency Dashboard.
 */
export async function getAgencyDashboardData(): Promise<AgencyDashboardStats> {
  const { supabase, agency, wallet } = await requireAgency();

  const [
    { count: clientCount },
    { count: projectCount },
    { count: receiptCount },
    { data: recentTxs },
    { data: recentLogsRaw },
  ] = await Promise.all([
    supabase
      .from("agency_business_relationships")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency.id),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency.id)
      .eq("status", "active"),
    supabase
      .from("api_receipts")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agency.id),
    supabase
      .from("wallet_transactions")
      .select("*, projects(name), businesses(name)")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("api_request_logs")
      .select("*, projects(name), businesses(name)")
      .eq("agency_id", agency.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const recentTransactions: WalletTransaction[] = (recentTxs || []).map((t: any) => ({
    id: t.id,
    walletId: t.wallet_id,
    agencyId: t.agency_id,
    projectId: t.project_id,
    businessId: t.business_id,
    projectName: t.projects?.name ?? null,
    businessName: t.businesses?.name ?? null,
    type: t.type,
    amountKobo: Number(t.amount_kobo) || 0,
    balanceAfterKobo: Number(t.balance_after_kobo) || 0,
    currency: t.currency || "NGN",
    reference: t.reference,
    idempotencyKey: t.idempotency_key,
    status: t.status,
    metadata: t.metadata || {},
    createdAt: t.created_at,
  }));

  const recentLogs: ApiRequestLog[] = (recentLogsRaw || []).map((l: any) => ({
    id: l.id,
    projectId: l.project_id,
    projectName: l.projects?.name ?? null,
    businessId: l.business_id,
    businessName: l.businesses?.name ?? null,
    endpoint: l.endpoint,
    method: l.method,
    statusCode: Number(l.status_code) || 200,
    durationMs: Number(l.duration_ms) || 0,
    ipAddress: l.ip_address,
    createdAt: l.created_at,
    errorMessage: l.error_message,
  }));

  return {
    agency,
    wallet,
    totalClients: clientCount || 0,
    totalWebsites: projectCount || 0,
    activeIntegrations: projectCount || 0,
    receiptsGenerated: receiptCount || 0,
    walletBalanceNaira: Math.round(wallet.balanceKobo / 100),
    recentTransactions,
    recentLogs,
  };
}

/**
 * Onboards a new client business under the agency.
 */
export async function createClientBusinessAction(formData: FormData): Promise<void> {
  const { supabase, agency } = await requireAgency();

  const name = String(formData.get("business_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const address = String(formData.get("address") || "").trim();
  const limitNaira = formData.get("spending_limit_naira");

  if (name.length < 2) {
    throw new Error("Client business name is required (at least 2 characters).");
  }

  const spendingLimitKobo =
    limitNaira && Number(limitNaira) > 0 ? Math.round(Number(limitNaira) * 100) : null;

  // 1. Create Business record
  const { data: business, error: bizErr } = await supabase
    .from("businesses")
    .insert({
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      owner_id: null, // Unclaimed by client user initially
    })
    .select("id")
    .single();

  if (bizErr || !business) {
    throw new Error(`Failed to create client business: ${bizErr?.message || "Unknown error"}`);
  }

  // 2. Create Agency-Business Relationship
  const { error: relErr } = await supabase.from("agency_business_relationships").insert({
    agency_id: agency.id,
    business_id: business.id,
    status: "active",
    spending_limit_kobo: spendingLimitKobo,
    spent_kobo: 0,
  });

  if (relErr) {
    throw new Error(`Failed to link client to agency: ${relErr.message}`);
  }

  revalidatePath("/partners/clients");
  redirect("/partners/clients");
}

/**
 * Lists all client businesses managed by the agency.
 */
export async function getAgencyClients(): Promise<ClientBusiness[]> {
  const { supabase, agency } = await requireAgency();

  const { data: rels, error } = await supabase
    .from("agency_business_relationships")
    .select(`
      id,
      status,
      spending_limit_kobo,
      spent_kobo,
      created_at,
      businesses (
        id,
        name,
        email,
        phone,
        address,
        logo_url,
        projects (id),
        api_receipts (id)
      )
    `)
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  if (error || !rels) return [];

  return rels.map((r: any) => {
    const b = r.businesses;
    const projectsCount = Array.isArray(b?.projects) ? b.projects.length : 0;
    const totalReceiptsCount = Array.isArray(b?.api_receipts) ? b.api_receipts.length : 0;

    return {
      id: b?.id || "",
      name: b?.name || "Unnamed Client",
      email: b?.email ?? null,
      phone: b?.phone ?? null,
      address: b?.address ?? null,
      logoUrl: b?.logo_url ?? null,
      status: r.status,
      spendingLimitKobo: r.spending_limit_kobo ? Number(r.spending_limit_kobo) : null,
      spentKobo: Number(r.spent_kobo) || 0,
      projectsCount,
      totalReceiptsCount,
      relationshipId: r.id,
      createdAt: r.created_at,
    };
  });
}

/**
 * Creates a website project under a client business and automatically generates initial API credentials.
 */
export async function createProjectAction(formData: FormData): Promise<void> {
  const { supabase, agency } = await requireAgency();

  const businessId = String(formData.get("business_id") || "").trim();
  const name = String(formData.get("project_name") || "").trim();
  const websiteUrl = String(formData.get("website_url") || "").trim();
  const environment = (String(formData.get("environment") || "production") === "sandbox"
    ? "sandbox"
    : "production") as "sandbox" | "production";

  if (!businessId) {
    throw new Error("Please select a client business.");
  }
  if (name.length < 2) {
    throw new Error("Website/project name is required.");
  }

  // 1. Create Project
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .insert({
      agency_id: agency.id,
      business_id: businessId,
      name,
      website_url: websiteUrl || null,
      environment,
      status: "active",
      receipts_count: 0,
    })
    .select("id")
    .single();

  if (projErr || !project) {
    throw new Error(`Failed to create project: ${projErr?.message || "Unknown error"}`);
  }

  // 2. Generate initial project API key
  await generateProjectApiKey({
    agencyId: agency.id,
    businessId,
    projectId: project.id,
    name: `${name} (${environment})`,
    environment,
  });

  revalidatePath("/partners/projects");
  revalidatePath("/partners/api-keys");
  redirect("/partners/projects");
}

/**
 * Lists all website projects belonging to the agency.
 */
export async function getAgencyProjects(): Promise<Project[]> {
  const { supabase, agency } = await requireAgency();

  const { data: projects, error } = await supabase
    .from("projects")
    .select(`
      *,
      businesses (name),
      api_keys (id, key_prefix, key_hint, status)
    `)
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  if (error || !projects) return [];

  return projects.map((p: any) => {
    const activeKey = Array.isArray(p.api_keys)
      ? p.api_keys.find((k: any) => k.status === "active")
      : null;

    return {
      id: p.id,
      agencyId: p.agency_id,
      businessId: p.business_id,
      businessName: p.businesses?.name || "Client",
      name: p.name,
      websiteUrl: p.website_url,
      environment: p.environment,
      status: p.status,
      receiptsCount: Number(p.receipts_count) || 0,
      lastReceiptAt: p.last_receipt_at,
      hasActiveKey: Boolean(activeKey),
      keyPrefix: activeKey?.key_prefix,
      keyHint: activeKey?.key_hint,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });
}

/**
 * Generates and hashes a new project API key. Returns the raw secret key ONCE.
 */
export async function generateProjectApiKey(params: {
  agencyId: string;
  businessId: string;
  projectId: string;
  name: string;
  environment: "sandbox" | "production";
}): Promise<{ apiKey: string; id: string; hint: string }> {
  const prefix = params.environment === "sandbox" ? "rela_test_sec_" : "rela_live_sec_";
  const rawSecret = `${prefix}${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(rawSecret);
  const hint = `${rawSecret.slice(0, 14)}...${rawSecret.slice(-4)}`;
  const keyPrefix = rawSecret.slice(0, 14) + "...";

  const supabase = getServiceSupabase();

  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .insert({
      agency_id: params.agencyId,
      business_id: params.businessId,
      project_id: params.projectId,
      name: params.name,
      key_prefix: keyPrefix,
      key_hint: hint,
      key_hash: keyHash,
      environment: params.environment,
      status: "active",
      rate_limit_per_minute: 240,
    })
    .select("id")
    .single();

  if (error || !keyRecord) {
    throw new Error(`Failed to generate API key: ${error?.message || "Unknown error"}`);
  }

  return { apiKey: rawSecret, id: keyRecord.id, hint };
}

/**
 * Revokes an API key.
 */
export async function revokeApiKeyAction(keyId: string): Promise<{ success: boolean; error?: string }> {
  const { supabase, agency } = await requireAgency();

  const { error } = await supabase
    .from("api_keys")
    .update({ status: "revoked" })
    .eq("id", keyId)
    .eq("agency_id", agency.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/partners/api-keys");
  return { success: true };
}

/**
 * Lists all API credentials for the agency.
 */
export async function getAgencyApiKeys(): Promise<ProjectApiKey[]> {
  const { supabase, agency } = await requireAgency();

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select(`
      id,
      name,
      key_prefix,
      key_hint,
      project_id,
      agency_id,
      business_id,
      environment,
      status,
      rate_limit_per_minute,
      last_used_at,
      created_at,
      projects (name),
      businesses (name)
    `)
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false });

  if (error || !keys) return [];

  return keys.map((k: any) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key_prefix,
    keyHint: k.key_hint,
    projectId: k.project_id,
    projectName: k.projects?.name,
    agencyId: k.agency_id,
    businessId: k.business_id,
    businessName: k.businesses?.name,
    environment: k.environment,
    status: k.status,
    rateLimitPerMinute: Number(k.rate_limit_per_minute) || 120,
    lastUsedAt: k.last_used_at,
    createdAt: k.created_at,
  }));
}

/**
 * Updates a client business's spending limit.
 */
export async function updateClientLimitAction(
  relationshipId: string,
  limitNaira: number | null
): Promise<{ success: boolean; error?: string }> {
  const { supabase, agency } = await requireAgency();

  const limitKobo = limitNaira !== null && limitNaira > 0 ? Math.round(limitNaira * 100) : null;

  const { error } = await supabase
    .from("agency_business_relationships")
    .update({ spending_limit_kobo: limitKobo })
    .eq("id", relationshipId)
    .eq("agency_id", agency.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/partners/clients");
  return { success: true };
}

/**
 * Initializes wallet funding with Paystack (or mock sandbox deposit for testing).
 */
export async function fundAgencyWalletAction(amountNaira: number): Promise<{
  success: boolean;
  authorizationUrl?: string;
  reference?: string;
  error?: string;
}> {
  const { supabase, agency } = await requireAgency();

  if (!amountNaira || amountNaira < 1000) {
    return { success: false, error: "Minimum wallet funding amount is ₦1,000." };
  }

  const amountKobo = Math.round(amountNaira * 100);
  const reference = `REL-WALLET-${agency.id.slice(0, 8)}-${Date.now()}`;

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (paystackSecret && !paystackSecret.includes("replace_me")) {
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || "https://rela-ng.vercel.app";
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: agency.email,
          amount: amountKobo,
          reference,
          callback_url: `${origin}/partners/wallet?ref=${reference}`,
          metadata: {
            agency_id: agency.id,
            agency_name: agency.name,
            type: "wallet_deposit",
          },
        }),
      });

      const data = await res.json();
      if (data?.status && data?.data?.authorization_url) {
        return {
          success: true,
          authorizationUrl: data.data.authorization_url,
          reference,
        };
      }
    } catch (e: any) {
      console.error("Paystack init error", e);
    }
  }

  // Direct sandbox fallback deposit (when testing without live payment gateway keys)
  const { data: creditRes, error: creditErr } = await supabase.rpc("credit_agency_wallet", {
    p_agency_id: agency.id,
    p_amount_kobo: amountKobo,
    p_reference: reference,
    p_metadata: { provider: "sandbox_direct", amount_naira: amountNaira },
  });

  if (creditErr) {
    return { success: false, error: `Deposit failed: ${creditErr.message}` };
  }

  revalidatePath("/partners/wallet");
  revalidatePath("/partners/dashboard");
  return { success: true, reference };
}

/**
 * Retrieves wallet transactions ledger for the agency.
 */
export async function getAgencyWalletData(): Promise<{
  wallet: AgencyWallet;
  transactions: WalletTransaction[];
}> {
  const { supabase, agency, wallet } = await requireAgency();

  const { data: txs, error } = await supabase
    .from("wallet_transactions")
    .select(`
      *,
      projects (name),
      businesses (name)
    `)
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const transactions: WalletTransaction[] = (txs || []).map((t: any) => ({
    id: t.id,
    walletId: t.wallet_id,
    agencyId: t.agency_id,
    projectId: t.project_id,
    businessId: t.business_id,
    projectName: t.projects?.name ?? null,
    businessName: t.businesses?.name ?? null,
    type: t.type,
    amountKobo: Number(t.amount_kobo) || 0,
    balanceAfterKobo: Number(t.balance_after_kobo) || 0,
    currency: t.currency || "NGN",
    reference: t.reference,
    idempotencyKey: t.idempotency_key,
    status: t.status,
    metadata: t.metadata || {},
    createdAt: t.created_at,
  }));

  return { wallet, transactions };
}

/**
 * Retrieves API request logs for the agency.
 */
export async function getAgencyLogs(): Promise<ApiRequestLog[]> {
  const { supabase, agency } = await requireAgency();

  const { data: logs, error } = await supabase
    .from("api_request_logs")
    .select(`
      *,
      projects (name),
      businesses (name)
    `)
    .eq("agency_id", agency.id)
    .order("created_at", { ascending: false })
    .limit(150);

  if (error || !logs) return [];

  return logs.map((l: any) => ({
    id: l.id,
    projectId: l.project_id,
    projectName: l.projects?.name ?? null,
    businessId: l.business_id,
    businessName: l.businesses?.name ?? null,
    endpoint: l.endpoint,
    method: l.method,
    statusCode: Number(l.status_code) || 200,
    durationMs: Number(l.duration_ms) || 0,
    ipAddress: l.ip_address,
    createdAt: l.created_at,
    errorMessage: l.error_message,
  }));
}
