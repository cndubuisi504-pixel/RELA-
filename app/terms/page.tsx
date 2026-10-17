import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use Rela to create and share business documents.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="17 October 2026">
      <p>
        These terms are an agreement between you and Rela (&ldquo;Rela&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;) for the use of the Rela website and application (the
        &ldquo;Service&rdquo;). By creating an account or using the Service you accept these
        terms. If you do not accept them, please do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        Rela helps businesses create, share, export and track receipts, invoices and quotations,
        convert quotations into invoices and invoices into receipts, and publish a public
        verification page for each document. Features may change as the product develops; we will
        not materially reduce a paid feature during a billing period you have already paid for.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>You must provide accurate business and contact information and keep it up to date.</li>
        <li>You are responsible for activity under your account and for keeping your credentials secure.</li>
        <li>You must be at least 18 years old and able to enter into a binding contract.</li>
        <li>One person or business should not maintain accounts to circumvent usage limits.</li>
      </ul>

      <h2>3. Free plan and limits</h2>
      <p>
        The Free plan allows five (5) documents per calendar month across receipts, invoices and
        quotations. When the limit is reached, creation is paused until the next calendar month or
        until you upgrade. Existing documents remain accessible, shareable and downloadable.
      </p>

      <h2>4. Paid subscriptions</h2>
      <ul>
        <li>The Starter plan is ₦2,500 per month unless another price is shown at checkout.</li>
        <li>
          Payments are processed by Flutterwave. By subscribing you also accept Flutterwave&apos;s
          terms and any fees disclosed at checkout. Rela does not store your full card details.
        </li>
        <li>
          A subscription becomes active only after the payment is verified by our servers. A
          checkout screen, redirect or browser callback on its own does not activate a plan.
        </li>
        <li>
          Subscriptions run for the period paid. Unless auto-renewal is offered and you enable it,
          you will need to renew manually before the end date to avoid interruption.
        </li>
        <li>
          If a subscription expires, your account returns to the Free plan. Historic documents are
          preserved. The Free monthly allowance is counted from documents created in the current
          month, so expiring does not grant a fresh allowance.
        </li>
        <li>
          Payments are generally non-refundable except where required by law or where we issued the
          charge in error. Contact us and we will review it honestly.
        </li>
      </ul>

      <h2>5. Your content</h2>
      <p>
        You own the business information, customer details and line items you enter, and the
        documents Rela generates from them. You grant us a limited licence to store, process,
        render and transmit that content only to operate the Service for you — including
        generating previews, exports and public verification pages you ask for.
      </p>
      <p>
        You are responsible for having a lawful basis to use your customers&apos; information and
        for the accuracy of every document you issue.
      </p>

      <h2>6. Rela is not a party to your transactions</h2>
      <p>
        Rela is a document tool, not a bank, payment processor, accountant, tax adviser or law
        firm. A document marked as verified confirms that it was issued through Rela and has not
        been altered in our records. It does not confirm that money changed hands, that a customer
        accepted a quotation, or that a document complies with your tax obligations. Always keep
        your own records.
      </p>

      <h2>7. Public verification pages</h2>
      <p>
        Every document can be shared through a public link containing a random token. Anyone with
        the link may view the limited information shown there. Do not include information in a
        document that you would not want a recipient of that link to see. You may revoke public
        visibility at any time from the document settings.
      </p>

      <h2>8. Acceptable use</h2>
      <ul>
        <li>Do not use Rela to issue fraudulent documents, impersonate a business, or misstate payments.</li>
        <li>Do not attempt to access another business&apos;s data, probe our systems, or bypass usage and access controls.</li>
        <li>Do not upload malware, unlawful content, or content that infringes another person&apos;s rights.</li>
        <li>Do not resell or white-label the Service without a written agreement with us.</li>
      </ul>
      <p>We may suspend accounts that break these rules, after notice where it is reasonable to give it.</p>

      <h2>9. Intellectual property</h2>
      <p>
        The Rela name, mark, interface and software belong to us. Your business name and logo
        remain yours. Nothing in these terms transfers ownership of either.
      </p>

      <h2>10. Availability</h2>
      <p>
        We work to keep Rela available and your data safe, but the Service is provided &ldquo;as
        is&rdquo; without a guarantee of uninterrupted availability. We may perform maintenance,
        and we may change or withdraw features. Where a change materially affects paid features,
        we will give reasonable notice.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by Nigerian law, Rela is not liable for indirect or
        consequential losses, loss of profit, or loss of business opportunity. Our total liability
        for any claim relating to the Service is limited to the amount you paid us in the twelve
        months before the claim arose, or ₦10,000 if you are on the Free plan. Nothing in these
        terms limits liability that cannot be limited by law.
      </p>

      <h2>12. Termination</h2>
      <p>
        You may stop using Rela at any time. We may suspend or terminate access for material breach
        of these terms, fraud, non-payment, or where required by law. On termination you may export
        your documents for a reasonable period; after that we may delete account data in line with
        our Privacy Policy.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria, and the courts of
        Lagos State have jurisdiction, without prejudice to any right you have to bring a claim
        where you live.
      </p>

      <h2>14. Changes to these terms</h2>
      <p>
        We may update these terms from time to time. If a change is material, we will notify you in
        the app or by email before it takes effect. Continuing to use Rela after that means you
        accept the updated terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${site.email}`}>{site.email}</a> or{" "}
        <a href="https://wa.me/2349153230482">+234 915 323 0482</a>.
      </p>
    </LegalShell>
  );
}
