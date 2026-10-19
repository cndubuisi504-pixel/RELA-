"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  initializeTransaction,
  verifyTransaction,
  paymentIsGenuine,
  STARTER_AMOUNT_KOBO,
  STARTER_CURRENCY,
} from "@/lib/paystack";
import { site } from "@/lib/site";

export type CheckoutState = { error?: string } | null;

/** Kick off hosted checkout. Stores a pending row so QA/webhooks can reconcile. */
export async function startCheckout(_prev: CheckoutState): Promise<CheckoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first, then upgrade." };

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  const email = user.email ?? "";
  if (!business || !email) return { error: "Finish setting up your business first." };

  const reference = `rel_${user.id.slice(0, 8)}_${Date.now()}`;

  let url: string;
  try {
    const init = await initializeTransaction({
      email,
      reference,
      callbackUrl: `${site.url}/billing/callback`,
      metadata: { user_id: user.id, business_id: business.id, plan: "starter" },
    });
    url = init.data.authorization_url;
  } catch (e) {
    console.error("paystack.initialize", e instanceof Error ? e.message : e);
    return { error: "Checkout didn’t start. Check your connection and try again." };
  }

  const admin = createAdminClient();
  await admin.from("subscriptions").upsert(
    {
      business_id: business.id,
      profile_id: user.id,
      provider: "paystack",
      plan: "starter",
      status: "pending",
      provider_reference: reference,
      amount_kobo: STARTER_AMOUNT_KOBO,
      currency: STARTER_CURRENCY,
    },
    { onConflict: "provider,provider_reference" },
  );

  redirect(url);
}

/**
 * Activate Starter after a verified payment. Idempotent: the unique
 * (provider, reference) constraint makes replays a no-op.
 */
export async function activateStarter(input: {
  userId: string;
  reference: string;
}): Promise<{ ok: boolean; error?: string }> {
  const data = await verifyTransaction(input.reference);
  if (!paymentIsGenuine(data)) {
    return { ok: false, error: "That payment couldn’t be verified as completed." };
  }

  // Ensure the payment belongs to the calling user
  const metaUserId = data.metadata?.user_id;
  if (metaUserId && metaUserId !== input.userId) {
    return { ok: false, error: "This payment reference belongs to a different account." };
  }

  const admin = createAdminClient();

  // Idempotency: if this reference has already been activated, do not extend subscription again
  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("status, profile_id")
    .eq("provider", "paystack")
    .eq("provider_reference", input.reference)
    .maybeSingle();

  if (existingSub) {
    if (existingSub.profile_id && existingSub.profile_id !== input.userId) {
      return { ok: false, error: "This payment reference belongs to a different account." };
    }
    if (existingSub.status === "active") {
      return { ok: true };
    }
  }

  const [{ data: business }, { data: profile }] = await Promise.all([
    admin.from("businesses").select("id").eq("owner_id", input.userId).maybeSingle(),
    admin.from("profiles").select("plan, subscription_status, subscription_ends_at").eq("id", input.userId).maybeSingle(),
  ]);
  if (!business) return { ok: false, error: "No business found for this account." };

  // Renewals extend from the later of now or the current end date.
  const now = new Date();
  const currentEnd = profile?.subscription_ends_at ? new Date(profile.subscription_ends_at) : null;
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const ends = new Date(base);
  ends.setMonth(ends.getMonth() + 1);

  const { error: subErr } = await admin.from("subscriptions").upsert(
    {
      business_id: business.id,
      profile_id: input.userId,
      provider: "paystack",
      plan: "starter",
      status: "active",
      provider_reference: input.reference,
      amount_kobo: data.amount,
      currency: data.currency,
      started_at: now.toISOString(),
      ends_at: ends.toISOString(),
      last_verified_at: now.toISOString(),
    },
    { onConflict: "provider,provider_reference" },
  );
  if (subErr) return { ok: false, error: "Payment verified, but we couldn’t record it. Contact support." };

  const { error: profErr } = await admin
    .from("profiles")
    .update({
      plan: "starter",
      subscription_status: "active",
      subscription_started_at: now.toISOString(),
      subscription_ends_at: ends.toISOString(),
    })
    .eq("id", input.userId);
  if (profErr) return { ok: false, error: "Payment verified, but activation failed. Contact support." };

  await admin.from("audit_logs").insert({
    business_id: business.id,
    actor_id: input.userId,
    action: "billing.activated",
    entity_type: "subscription",
    entity_id: null,
    metadata: { provider: "paystack", reference: input.reference, amount_kobo: data.amount },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
