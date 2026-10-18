import "server-only";

/**
 * Paystack server client. Hosted checkout only — no Paystack key is ever
 * inlined into the client bundle (the public key stays server-side too).
 */
const BASE = "https://api.paystack.co";

export const STARTER_AMOUNT_KOBO = 250_000; // ₦2,500.00
export const STARTER_CURRENCY = "NGN";

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as { status?: boolean; message?: string } & T;
  if (!res.ok || body.status === false) {
    throw new Error(body.message ?? `Paystack request failed (${res.status})`);
  }
  return body;
}

export type InitializeResult = {
  data: { authorization_url: string; access_code: string; reference: string };
};

export async function initializeTransaction(input: {
  email: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitializeResult> {
  return call<InitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: STARTER_AMOUNT_KOBO,
      currency: STARTER_CURRENCY,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export type VerifyData = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  customer: { email: string; customer_code?: string } | null;
  metadata: { user_id?: string; plan?: string } | null;
};

/** Never trust redirect params or webhook payloads — always re-verify. */
export async function verifyTransaction(reference: string): Promise<VerifyData> {
  const res = await call<{ data: VerifyData }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  return res.data;
}

/** Accept a transaction only when Paystack says it cleared, for our exact amount + currency. */
export function paymentIsGenuine(data: { status: string; amount: number; currency: string }): boolean {
  return (
    data.status === "success" &&
    data.amount === STARTER_AMOUNT_KOBO &&
    data.currency === STARTER_CURRENCY
  );
}
