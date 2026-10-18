import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { activateStarter } from "@/lib/billing/actions";

/**
 * Paystack sends the customer back here. The browser's query params prove
 * nothing — activation only follows a server-side re-verify, and the
 * transaction must belong to the signed-in user.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");

  if (!reference || !/^[\w-]{6,64}$/.test(reference)) {
    redirect("/upgrade?paid=invalid");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/billing/callback?reference=${reference}`);

  try {
    const result = await activateStarter({ userId: user.id, reference });
    redirect(`/upgrade?paid=${result.ok ? "1" : "failed"}`);
  } catch (e) {
    if (e instanceof Error && "digest" in e) throw e; // Next redirect
    console.error("billing.callback", e instanceof Error ? e.message : e);
    redirect("/upgrade?paid=failed");
  }
}
