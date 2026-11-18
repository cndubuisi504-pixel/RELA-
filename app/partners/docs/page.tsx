export default function AgencyDocsPage() {
  const curlExample = `curl -X POST https://rela-ng.vercel.app/v1/receipts \\
  -H "Authorization: Bearer rela_live_sec_your_secret_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "reference": "ORD_948291038",
    "customer": {
      "name": "Chidinma Nwosu",
      "email": "chidinma@email.com",
      "phone": "08031234567"
    },
    "items": [
      {
        "name": "Silk Floral Wrap Dress",
        "quantity": 1,
        "unit_price": 45000
      }
    ],
    "delivery_fee": 3000,
    "discount": 0,
    "total": 48000,
    "currency": "NGN",
    "payment_method": "Card / Paystack"
  }'`;

  const nodeExample = `import fetch from "node-fetch";

const res = await fetch("https://rela-ng.vercel.app/v1/receipts", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${process.env.RELA_PROJECT_SECRET_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    reference: order.id,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
    },
    items: order.items.map(item => ({
      name: item.title,
      quantity: item.qty,
      unit_price: item.price,
    })),
    delivery_fee: order.shipping_fee,
    total: order.total_amount,
    currency: "NGN",
    payment_method: "Paystack",
  }),
});

const data = await res.json();
console.log("Verifiable receipt URL:", data.verification_url);
console.log("PDF download URL:", data.pdf_url);`;

  const phpExample = `<?php
$payload = [
    'reference' => $order_id,
    'customer' => [
        'name' => $customer_name,
        'email' => $customer_email,
        'phone' => $customer_phone,
    ],
    'items' => $items,
    'delivery_fee' => $shipping_total,
    'total' => $order_total,
    'currency' => 'NGN',
    'payment_method' => 'Debit Card'
];

$ch = curl_init('https://rela-ng.vercel.app/v1/receipts');
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . getenv('RELA_PROJECT_SECRET_KEY'),
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$result = json_decode($response, true);
curl_close($ch);

// Attach $result['pdf_url'] to customer confirmation email!
?>`;

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div>
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--primary)]">
          Developer Guide
        </span>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
          Website Integration &amp; API Reference
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          How to integrate automated receipt generation into your clients&apos; custom stores, Shopify backends, and WooCommerce websites.
        </p>
      </div>

      {/* 1. Workflow */}
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <h2 className="text-[18px] font-semibold text-ink">1. How Rela Partners Billing Works</h2>
        <p className="text-[14px] leading-relaxed text-ink-2">
          Every website project provisioned in Rela Partners has unique API credentials (<code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px] font-mono text-ink">rela_live_sec_...</code> or <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[12px] font-mono text-ink">rela_test_sec_...</code>).
        </p>
        <ul className="list-inside list-disc space-y-2 text-[13.5px] text-ink-2">
          <li>
            <strong>Sandbox Keys (<code className="font-mono text-xs">rela_test_sec_</code>)</strong>: 100% free. Generates real verifiable test receipts and downloadable test PDFs with watermark. Zero wallet deductions.
          </li>
          <li>
            <strong>Production Keys (<code className="font-mono text-xs">rela_live_sec_</code>)</strong>: Atomically deducts <strong>₦100</strong> from your central agency wallet upon successful receipt generation.
          </li>
          <li>
            <strong>Idempotency Guaranteed</strong>: Sending the same order <code className="font-mono text-xs">reference</code> multiple times will never double-charge your wallet. It safely returns the existing receipt record.
          </li>
        </ul>
      </section>

      {/* 2. Generating Receipts */}
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-ink">2. Create &amp; Issue Receipt</h2>
          <span className="rounded-md bg-[var(--success-bg)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--success)]">
            POST /v1/receipts
          </span>
        </div>

        <p className="text-[13.5px] text-ink-2">
          Trigger this endpoint after your client&apos;s checkout confirms payment (e.g. from a Paystack or Flutterwave webhook).
        </p>

        {/* cURL Example */}
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">cURL Request</p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-[var(--invert-bg)] p-4 text-[12px] leading-relaxed text-[var(--invert-text)] font-mono">
            <code>{curlExample}</code>
          </pre>
        </div>

        {/* Node.js Example */}
        <div className="pt-2">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Node.js / TypeScript</p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-[var(--invert-bg)] p-4 text-[12px] leading-relaxed text-[var(--invert-text)] font-mono">
            <code>{nodeExample}</code>
          </pre>
        </div>

        {/* PHP Example */}
        <div className="pt-2">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">PHP / WooCommerce</p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-[var(--invert-bg)] p-4 text-[12px] leading-relaxed text-[var(--invert-text)] font-mono">
            <code>{phpExample}</code>
          </pre>
        </div>
      </section>

      {/* 3. Handling Error Responses */}
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-xs space-y-4">
        <h2 className="text-[18px] font-semibold text-ink">3. HTTP Status Codes &amp; Error Handling</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[11.5px] font-medium uppercase tracking-wider text-ink-3">
                <th className="pb-2.5">Code</th>
                <th className="pb-2.5">Error Key</th>
                <th className="pb-2.5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              <tr>
                <td className="py-2.5 font-mono font-bold text-[var(--success)]">201 Created</td>
                <td className="py-2.5 font-mono text-xs">success</td>
                <td className="py-2.5 text-ink-2">Receipt created. Returns verification URL and PDF download URL.</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono font-bold text-[var(--warning,#b45309)]">402 Payment Required</td>
                <td className="py-2.5 font-mono text-xs text-[var(--danger,#e11d48)]">insufficient_funds</td>
                <td className="py-2.5 text-ink-2">Agency wallet balance is below ₦100. Fund wallet in dashboard.</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono font-bold text-[var(--warning,#b45309)]">402 Payment Required</td>
                <td className="py-2.5 font-mono text-xs text-[var(--danger,#e11d48)]">client_spending_limit_exceeded</td>
                <td className="py-2.5 text-ink-2">Client reached its allocated spending cap. Increase limit in Clients tab.</td>
              </tr>
              <tr>
                <td className="py-2.5 font-mono font-bold text-ink-3">401 Unauthorized</td>
                <td className="py-2.5 font-mono text-xs">invalid_key</td>
                <td className="py-2.5 text-ink-2">Secret key is invalid or revoked. Check API Keys tab.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
