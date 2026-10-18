import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activateStarter } from "@/lib/billing/actions";

export const runtime = "nodejs";

/**
 * Paystack → Rela. Signature = HMAC-SHA512(raw body, secret key).
 * Payloads are never trusted at face value: every charge.success is
 * re-verified against Paystack's API before any plan changes.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const ok =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let event: { event?: string; data?: { reference?: string; metadata?: { user_id?: string } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ ok: true }); // acknowledged, nothing to do
  }

  const reference = event.data.reference;
  const userId = event.data.metadata?.user_id;

  // Event ledger: dedupe retries by reference before doing any work.
  const admin = createAdminClient();
  const { error: ledgerErr } = await admin.from("subscription_events").insert({
    provider: "paystack",
    provider_event_id: `charge.success:${reference}`,
    event_type: "charge.success",
    reference,
    payload: JSON.parse(raw),
    status: "received",
  });
  if (ledgerErr?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });

  try {
    if (!userId) throw new Error("missing metadata.user_id");
    const result = await activateStarter({ userId, reference });
    await admin
      .from("subscription_events")
      .update({ status: result.ok ? "verified" : "failed", processing_error: result.error ?? null, processed_at: new Date().toISOString() })
      .eq("provider", "paystack")
      .eq("provider_event_id", `charge.success:${reference}`);
    return NextResponse.json({ ok: result.ok });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown";
    await admin
      .from("subscription_events")
      .update({ status: "failed", processing_error: message, processed_at: new Date().toISOString() })
      .eq("provider", "paystack")
      .eq("provider_event_id", `charge.success:${reference}`);
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }
}
