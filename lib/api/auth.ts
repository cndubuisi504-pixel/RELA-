import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

if (typeof globalThis.WebSocket === "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { WebSocket } = require("undici");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).WebSocket = WebSocket;
  } catch {
    // Ignore if not present
  }
}

// In-memory rate limiting bucket per API key / IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number = 120, windowMs: number = 60000): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count += 1;
  return { allowed: true };
}

export type ApiKeyValidationResult =
  | {
      authenticated: true;
      keyId: string;
      name: string;
      businessId?: string | null;
    }
  | {
      authenticated: false;
      error: "unauthorized" | "rate_limit_exceeded";
      status: number;
      message: string;
      retryAfter?: number;
    };

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey.trim()).digest("hex");
}

export function generateRawApiKey(environment: "live" | "test" = "live"): string {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  return `rela_${environment}_${randomBytes}`;
}

export async function validateApiKey(request: Request): Promise<ApiKeyValidationResult> {
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key");
  let rawKey: string | null = null;

  if (authHeader) {
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      rawKey = authHeader.slice(7).trim();
    } else {
      rawKey = authHeader.trim();
    }
  }

  if (!rawKey) {
    return {
      authenticated: false,
      error: "unauthorized",
      status: 401,
      message: "Missing API key. Provide Authorization: Bearer <API_KEY> header.",
    };
  }

  // 1. Check environment variable master key fallback (e.g. RELA_API_KEY)
  const masterKey = process.env.RELA_API_KEY;
  if (masterKey && rawKey === masterKey.trim()) {
    const rateCheck = checkRateLimit(`env_master_${rawKey.slice(-8)}`, 300);
    if (!rateCheck.allowed) {
      return {
        authenticated: false,
        error: "rate_limit_exceeded",
        status: 429,
        message: "Rate limit exceeded. Please wait before retrying.",
        retryAfter: rateCheck.retryAfter,
      };
    }
    return {
      authenticated: true,
      keyId: "master_env_key",
      name: "Master Storefront Key",
      businessId: null,
    };
  }

  // 2. Lookup in api_keys table via SHA-256 hash
  const keyHash = hashApiKey(rawKey);
  const supabase = getServiceSupabase();

  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .select("id, name, business_id, status, rate_limit_per_minute")
    .eq("key_hash", keyHash)
    .single();

  if (error || !keyRecord) {
    return {
      authenticated: false,
      error: "unauthorized",
      status: 401,
      message: "Invalid API key provided. Ensure your secret key is active and formatted correctly.",
    };
  }

  if (keyRecord.status !== "active") {
    return {
      authenticated: false,
      error: "unauthorized",
      status: 401,
      message: "API key has been revoked or deactivated.",
    };
  }

  // Rate limit check
  const rateLimit = keyRecord.rate_limit_per_minute || 120;
  const rateCheck = checkRateLimit(keyRecord.id, rateLimit);
  if (!rateCheck.allowed) {
    return {
      authenticated: false,
      error: "rate_limit_exceeded",
      status: 429,
      message: "Rate limit exceeded. Please wait before retrying.",
      retryAfter: rateCheck.retryAfter,
    };
  }

  // Update last_used_at asynchronously
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id)
    .then(() => {}, () => {});

  return {
    authenticated: true,
    keyId: keyRecord.id,
    name: keyRecord.name,
    businessId: keyRecord.business_id,
  };
}

/**
 * Creates and registers a new secret API key in the database.
 */
export async function createNewApiKey(params: {
  name: string;
  businessId?: string | null;
  environment?: "live" | "test";
  rateLimitPerMinute?: number;
}): Promise<{ apiKey: string; id: string; name: string; prefix: string }> {
  const rawKey = generateRawApiKey(params.environment ?? "live");
  const keyHash = hashApiKey(rawKey);
  const prefix = rawKey.slice(0, 14) + "...";
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      name: params.name,
      key_prefix: prefix,
      key_hash: keyHash,
      business_id: params.businessId ?? null,
      status: "active",
      rate_limit_per_minute: params.rateLimitPerMinute ?? 120,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create API key: ${error?.message || "Unknown error"}`);
  }

  return {
    apiKey: rawKey,
    id: data.id,
    name: data.name,
    prefix,
  };
}
