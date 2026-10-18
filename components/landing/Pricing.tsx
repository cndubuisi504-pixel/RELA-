import Link from "next/link";
import { CheckIcon } from "@/components/ui/icons";

type Plan = {
  id: string;
  name: string;
  tag: string;
  price: string;
  priceNote: string;
  blurb: string;
  features: string[];
  cta: { label: string; href: string };
  note?: string;
  featured?: boolean;
};

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    tag: "Free forever",
    price: "₦0",
    priceNote: "no card",
    blurb: "For getting your first documents out the door.",
    features: [
      "5 documents per calendar month",
      "Receipts, invoices and quotations",
      "WhatsApp sharing and PDF / image export",
      "Public verification links",
      "rela. watermark on documents",
    ],
    cta: { label: "Start free", href: "/signup" },
  },
  {
    id: "starter",
    name: "Starter",
    tag: "Most popular",
    price: "₦2,500",
    priceNote: "per month",
    blurb: "For businesses that bill every week.",
    features: [
      "Unlimited documents",
      "No watermark",
      "Quotation → invoice → receipt conversion",
      "Payment tracking and outstanding balances",
      "Analytics for Business Pro",
      "Priority email support",
    ],
    cta: { label: "Get Starter", href: "/signup?plan=starter" },
    note: "Billed monthly with Paystack. Renew or cancel anytime.",
    featured: true,
  },
  {
    id: "api",
    name: "Developer",
    tag: "Private preview",
    price: "Custom",
    priceNote: "negotiated",
    blurb: "For teams that need documents inside their own systems.",
    features: [
      "REST access to your documents",
      "Create receipts, invoices and quotations programmatically",
      "Sandbox and production keys",
      "A direct line to our engineering team",
    ],
    cta: { label: "For Devs — API Access", href: "/api-docs" },
    note: "API pricing is negotiated with our team. No public price.",
  },
];

function Panel({ plan }: { plan: Plan }) {
  const featured = plan.featured;

  return (
    <article
      className={[
        "relative flex flex-col border p-7 sm:p-8",
        "rounded-[2rem] lg:rounded-b-[2.5rem] lg:rounded-t-[8.5rem]",
        featured
          ? "border-[var(--invert-border)] bg-[var(--invert-bg)] text-[var(--invert-text)] shadow-[var(--shadow-2)]"
          : "border-line bg-surface",
      ].join(" ")}
      aria-labelledby={`plan-${plan.id}`}
    >
      <div className="flex h-7 items-center lg:justify-center">
        <span
          className={[
            "inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-medium",
            featured
              ? "bg-primary text-[var(--primary-ink)]"
              : "border border-line text-ink-3",
          ].join(" ")}
        >
          {plan.tag}
        </span>
      </div>

      <h3
        id={`plan-${plan.id}`}
        className="mt-7 text-[19px] font-medium tracking-tight lg:text-center"
      >
        {plan.name}
      </h3>

      <p className="mt-2 flex items-baseline gap-2 lg:justify-center">
        <span className="num text-[42px] font-medium leading-none tracking-tight">
          {plan.price}
        </span>
        <span
          className={[
            "text-[13px]",
            featured ? "text-[var(--invert-muted)]" : "text-ink-3",
          ].join(" ")}
        >
          {plan.priceNote}
        </span>
      </p>

      <p
        className={[
          "mt-4 text-[14.5px] leading-relaxed lg:text-center",
          featured ? "text-[var(--invert-muted)]" : "text-ink-2",
        ].join(" ")}
      >
        {plan.blurb}
      </p>

      <div
        className={[
          "my-6 border-t",
          featured ? "border-[var(--invert-border)]" : "border-line",
        ].join(" ")}
      />

      <ul className="space-y-3.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5">
            <span
              className={[
                "mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                featured
                  ? "bg-primary text-[var(--primary-ink)]"
                  : "border border-line text-[var(--accent-text)]",
              ].join(" ")}
            >
              <CheckIcon size={11} strokeWidth={2.6} />
            </span>
            <span
              className={[
                "text-[14px] leading-snug",
                featured ? "text-[var(--invert-text)]" : "text-ink-2",
              ].join(" ")}
            >
              {f}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex-1" />

      <Link
        href={plan.cta.href}
        className={[
          "btn btn-block",
          featured ? "btn-primary" : "btn-ghost",
        ].join(" ")}
      >
        {plan.cta.label}
      </Link>

      {plan.note && (
        <p
          className={[
            "mt-3 text-center text-[11.5px] leading-relaxed",
            featured ? "text-[var(--invert-muted)]" : "text-ink-3",
          ].join(" ")}
        >
          {plan.note}
        </p>
      )}
    </article>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 py-20 md:py-28">
      <div className="container-x">
        <div className="mx-auto max-w-[640px] text-center">
          <p className="eyebrow">Pricing</p>
          <h2 className="h-section mt-4 text-ink">Pricing that stays out of the way.</h2>
          <p className="lede mx-auto mt-4 max-w-[48ch]">
            Start free. Upgrade when the invoices start stacking up.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:mt-16 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
            <Panel key={plan.id} plan={plan} />
          ))}
        </div>

        <p className="mt-8 text-center text-[12.5px] text-ink-3">
          Prices in Naira. The Free plan gives you 5 documents every calendar month across
          receipts, invoices and quotations.
        </p>
      </div>
    </section>
  );
}
