import type { Metadata } from "next";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { WhatsAppIcon, XIcon } from "@/components/ui/icons";
import { site, whatsappLink, xUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: "Talk to the people building Rela — email or WhatsApp.",
};

const faqs = [
  {
    q: "How many documents can I create for free?",
    a: "Five per calendar month, shared across receipts, invoices and quotations. The counter resets on the first day of each month.",
  },
  {
    q: "What happens when I hit the free limit?",
    a: "Creation pauses until the next month or until you upgrade to Starter. Your existing documents stay available to view, share and download.",
  },
  {
    q: "Can I convert a quotation into an invoice?",
    a: "Yes. Open the quotation and choose Convert to invoice. Customer details, items and totals carry over — you never retype them. Conversion is a Starter feature.",
  },
  {
    q: "What does the public verification page show?",
    a: "The business name and logo, document type and number, date, items and totals, and payment status. It never shows internal notes, private tags or staff information.",
  },
  {
    q: "How do I pay for Starter?",
    a: "Through Paystack at checkout — card, bank transfer or USSD. Your plan activates only after our servers verify the payment, which usually takes a few seconds.",
  },
  {
    q: "Is my customers' data safe?",
    a: "Documents are protected by row-level security so no other business can read them. Public links use random, unguessable tokens and can be revoked.",
  },
];

export default function SupportPage() {
  return (
    <>
      <Header />
      <main id="main" className="pt-28 md:pt-36">
        <section className="container-x">
          <div className="max-w-[640px]">
            <p className="eyebrow">Support</p>
            <h1 className="h-display mt-5 text-ink">We're a message away.</h1>
            <p className="lede mt-5">
              Email or WhatsApp us and you'll be talking to the people who build Rela. Typical
              response time is under one business day, Monday to Saturday, 9:00–18:00 WAT.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href={`mailto:${site.email}`}
              className="group rounded-[22px] border border-line bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-1)]"
            >
              <p className="eyebrow">Email</p>
              <p className="mt-3 break-all text-[17px] font-medium text-ink group-hover:underline">
                {site.email}
              </p>
              <p className="mt-2 text-[13.5px] text-ink-3">
                Best for account questions, billing and anything with screenshots.
              </p>
            </a>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[22px] border border-line bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-1)]"
            >
              <p className="eyebrow">WhatsApp</p>
              <p className="mt-3 flex items-center gap-2 text-[17px] font-medium text-ink group-hover:underline">
                <WhatsAppIcon size={17} />
                Chat on WhatsApp
              </p>
              <p className="mt-2 text-[13.5px] text-ink-3">Fastest for quick questions while you work.</p>
            </a>
            <a
              href={xUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[22px] border border-line bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-1)]"
            >
              <p className="eyebrow">X (Twitter)</p>
              <p className="mt-3 flex items-center gap-2 text-[17px] font-medium text-ink group-hover:underline">
                <XIcon size={15} />
                @therelasol
              </p>
              <p className="mt-2 text-[13.5px] text-ink-3">Follow for updates or send us a DM.</p>
            </a>
          </div>
        </section>

        <section className="container-x py-16 md:py-24">
          <h2 className="h-section text-ink">Common questions</h2>
          <div className="mt-8 divide-y divide-line rounded-[22px] border border-line bg-surface">
            {faqs.map((f) => (
              <details key={f.q} className="group px-5 py-1 sm:px-6">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[15.5px] font-medium text-ink">
                  {f.q}
                  <span className="text-ink-3 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-[65ch] text-[14.5px] leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
