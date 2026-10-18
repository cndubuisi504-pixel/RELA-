"use client";

import { useActionState } from "react";
import { startCheckout, type CheckoutState } from "@/lib/billing/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Alert } from "@/components/ui/Alert";

export function CheckoutButton() {
  const [state, action] = useActionState<CheckoutState, FormData>(startCheckout, null);
  return (
    <form action={action} className="space-y-2">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton pendingLabel="Opening checkout…">Pay ₦2,500 with Paystack</SubmitButton>
      <p className="text-center text-[12px] leading-relaxed text-ink-3">
        Card, bank transfer or USSD — secured by Paystack. Your plan activates the moment our
        servers verify the payment.
      </p>
    </form>
  );
}
