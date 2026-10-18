import type { Metadata } from "next";
import { LegalShell } from "@/components/legal/LegalShell";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Rela collects, why, and the choices you have over your business data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="17 October 2026">
      <p>
        This policy explains how Rela collects and uses personal information when you use our
        website and application. We handle personal data in line with the Nigeria Data Protection
        Act 2023 (NDPA) and, where it applies to our users, the GDPR.
      </p>

      <h2>1. Who is responsible for your data</h2>
      <p>
        Rela is the data controller for account and usage data. For the customer details you enter
        into documents, you are the controller and Rela acts as your processor: we handle that
        information only to provide the Service to you.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — name, email address, password (stored hashed by our auth
          provider), and authentication metadata.
        </li>
        <li>
          <strong>Business data</strong> — business name, address, phone number, logo, signature,
          bank details you choose to add, and document preferences.
        </li>
        <li>
          <strong>Document data</strong> — the customer details, line items, totals, statuses and
          notes you enter, plus the documents generated from them.
        </li>
        <li>
          <strong>Payment data</strong> — plan, subscription status, transaction references and
          verification timestamps. Card details are collected and processed by Paystack; Rela
          never receives your full card number.
        </li>
        <li>
          <strong>Technical data</strong> — IP address, browser and device information, and
          security logs needed to protect the Service.
        </li>
      </ul>

      <h2>3. Why we use it</h2>
      <ul>
        <li>To create your account and provide the features you ask for (contract).</li>
        <li>To take payments, verify them and manage your subscription (contract, legal obligation).</li>
        <li>To keep the Service secure, prevent fraud and investigate abuse (legitimate interests).</li>
        <li>To send service messages — payment confirmations, subscription reminders, security alerts (contract).</li>
        <li>To improve the product using aggregated, non-identifying analytics (legitimate interests).</li>
        <li>To meet tax, accounting and other legal obligations (legal obligation).</li>
      </ul>
      <p>We do not sell your personal data, and we do not use your documents to train advertising profiles.</p>

      <h2>4. Public verification pages</h2>
      <p>
        When you share a document link, anyone with that link can see a limited page: your business
        name and logo, document type and number, issue date, item descriptions and totals, and the
        payment status. Internal notes, private tags, staff information and account details are
        never shown. Customer name is shown only where you have configured it to be safe to show.
        Links use unguessable random tokens and can be revoked.
      </p>

      <h2>5. Who we share data with</h2>
      <ul>
        <li><strong>Supabase</strong> — database, authentication and file storage.</li>
        <li><strong>Paystack</strong> — payment processing and subscription billing.</li>
        <li><strong>Vercel</strong> — application hosting and delivery.</li>
        <li><strong>Email providers</strong> — transactional messages such as password resets and receipts.</li>
        <li>Professional advisers, or authorities where the law requires it.</li>
      </ul>
      <p>
        These providers act under contract and may process data outside Nigeria. Where that
        happens we rely on appropriate safeguards recognised under the NDPA.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        Documents and account data are kept while your account is active. If you close your
        account, we delete or anonymise personal data within a reasonable period, except records we
        must keep for tax, accounting, fraud prevention or legal claims. Subscription transaction
        records are typically kept for six years.
      </p>

      <h2>7. Security</h2>
      <p>
        Data is encrypted in transit and at rest by our infrastructure providers. Access is
        restricted by row-level security so one business cannot read another business&apos;s
        documents, and administrative access is limited to the platform owner. No system is
        perfectly secure; if a breach affects your data we will notify you as required by law.
      </p>

      <h2>8. Your rights</h2>
      <p>Under the NDPA you can ask to:</p>
      <ul>
        <li>access the personal data we hold about you and receive a copy;</li>
        <li>correct inaccurate data;</li>
        <li>delete data we no longer need;</li>
        <li>restrict or object to certain processing;</li>
        <li>receive your data in a portable format.</li>
      </ul>
      <p>
        Write to <a href={`mailto:${site.email}`}>{site.email}</a> and we will respond within the
        time the law allows. If you are unhappy with our answer you can complain to the Nigeria Data
        Protection Commission (NDPC).
      </p>

      <h2>9. Cookies and local storage</h2>
      <p>
        Rela uses essential cookies for authentication and a single local-storage entry to remember
        whether you chose light or dark mode. We do not use advertising cookies. If we add product
        analytics later, we will ask for consent where required.
      </p>

      <h2>10. Children</h2>
      <p>Rela is a business tool intended for adults. It is not directed at anyone under 18.</p>

      <h2>11. Changes</h2>
      <p>
        If this policy changes materially we will tell you in the app or by email before the change
        takes effect. The date at the top always shows the current version.
      </p>

      <h2>12. Contact</h2>
      <p>
        Privacy questions and requests: <a href={`mailto:${site.email}`}>{site.email}</a> or on{" "}
        <a href={whatsappLink}>WhatsApp</a>.
      </p>
    </LegalShell>
  );
}
