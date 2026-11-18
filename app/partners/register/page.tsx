import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { registerAgencyAction } from "@/lib/partners/actions";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function RegisterAgencyPage() {
  const authSupabase = await createClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  return (
    <div className="mx-auto max-w-lg py-6 sm:py-10">
      <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-[var(--shadow-1)]">
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--primary)]">
          Agency Registration
        </span>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
          Create your agency workspace
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
          Start onboarding clients, provisioning website projects, and generating receipt credentials.
        </p>

        {!user ? (
          <div className="mt-6 rounded-xl border border-[var(--primary-soft)] bg-[var(--primary-soft)]/25 p-4 text-[13.5px]">
            <p className="font-medium text-ink">You need a Rela account first.</p>
            <p className="mt-1 text-ink-3">
              Please sign up or log in with your primary email to anchor your agency ownership.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/signup?next=/partners/register" className="btn btn-primary btn-sm">
                Create Account →
              </Link>
              <Link href="/login?next=/partners/register" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <form action={registerAgencyAction} className="mt-6 space-y-4">
            <Field
              label="Agency name"
              name="agency_name"
              placeholder="e.g. Pixel Crafters Studios"
              required
            />

            <Field
              label="Agency contact email"
              name="agency_email"
              type="email"
              defaultValue={user.email ?? ""}
              placeholder="team@pixelcrafters.ng"
              required
            />

            <Field
              label="Phone number / WhatsApp"
              name="phone"
              type="tel"
              placeholder="0803 123 4567"
              hint="For critical low-balance alerts and webhook updates."
            />

            <Field
              label="Agency website"
              name="website"
              type="url"
              placeholder="https://pixelcrafters.ng"
              hint="Optional."
            />

            <div className="pt-2">
              <SubmitButton pendingLabel="Creating agency workspace…">
                Register Agency Workspace →
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
