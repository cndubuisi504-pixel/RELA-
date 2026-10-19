"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DocumentItemsEditor } from "@/components/documents/DocumentItemsEditor";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { createDocument } from "@/lib/documents/actions";
import { typeMeta, type DocType } from "@/lib/documents/status";
import {
  lineTotalKobo,
  currencyOptions,
  newItem,
  type EditorItem,
  type EditorMode,
  type QuantityLabel,
} from "@/lib/documents/editor-types";
import { formatKobo, currencySymbol, type Currency } from "@/lib/money";

export function DocumentEditor({
  type,
  defaultMode,
  defaultCurrency,
  defaultPaymentInstructions,
  quantityLabelDefault,
}: {
  type: DocType;
  defaultMode: EditorMode;
  defaultCurrency: Currency;
  defaultPaymentInstructions: string;
  quantityLabelDefault: QuantityLabel;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [mode, setMode] = useState<EditorMode>(defaultMode);
  const [showQuantity, setShowQuantity] = useState(false);
  const [quantityLabel, setQuantityLabel] = useState<QuantityLabel>(quantityLabelDefault);
  const [items, setItems] = useState<EditorItem[]>([newItem()]);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [instructions, setInstructions] = useState(defaultPaymentInstructions);

  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [delivery, setDelivery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [dueDate, setDueDate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [terms, setTerms] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const quantityEnabled = mode === "product" || showQuantity;

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + lineTotalKobo(item, quantityEnabled), 0),
    [items, quantityEnabled],
  );
  const discountKobo = Math.round((Number(discount.replace(/[₦$£€,\s]/g, "")) || 0) * 100);
  const taxKobo = Math.round((Number(tax.replace(/[₦$£€,\s]/g, "")) || 0) * 100);
  // Delivery fee is a product-mode charge (couriers/dispatch); services bill time instead.
  const deliveryKobo =
    mode === "product" ? Math.round((Number(delivery.replace(/[₦$£€,\s]/g, "")) || 0) * 100) : 0;
  const total = Math.max(0, subtotal - discountKobo + taxKobo + deliveryKobo);

  function submit() {
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const result = await createDocument({
        type,
        customerName,
        customerPhone,
        customerEmail,
        mode,
        showQuantity,
        quantityLabel,
        currency,
        paymentInstructions: instructions,
        items: items.map((i) => ({
          name: i.name,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discount,
        tax,
        delivery,
        // Receipts are proof of payment: full total always (rule enforced in the action too).
        amountPaid: type === "receipt" ? String(total / 100) : "0",
        paymentMethod: type === "receipt" ? paymentMethod : "",
        dueDate,
        validUntil,
        terms,
        notes: "",
      });

      if (!result.ok) {
        setError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        return;
      }
      router.push(`/documents/${result.id}?created=1`);
    });
  }

  const meta = typeMeta[type];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard" className="text-[12.5px] text-ink-3 hover:text-ink">
            ← Back
          </Link>
          <h1 className="mt-1 text-[24px] font-medium leading-tight tracking-[-0.03em] text-ink">
            New {meta.label.toLowerCase()}
          </h1>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Customer</h2>
        <div className="mt-3 space-y-3">
          <Field
            label="Name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Chinedu Okafor"
            error={fieldErrors.customerName}
            autoComplete="off"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="0803 123 4567"
              autoComplete="off"
            />
            <Field
              label="Email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              type="email"
              inputMode="email"
              placeholder="customer@email.com"
              autoComplete="off"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Currency</h2>
        <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Currency">
          {currencyOptions.map((c) => (
            <label key={c.id} className="relative cursor-pointer">
              <input
                type="radio"
                name="document-currency"
                value={c.id}
                checked={currency === c.id}
                onChange={() => setCurrency(c.id)}
                className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                aria-label={`${c.symbol} ${c.id}`}
              />
              <span
                className={[
                  "flex min-h-11 flex-col items-center justify-center rounded-xl border text-[13px] transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)]",
                currency === c.id
                  ? "border-transparent bg-[var(--invert-bg)] font-medium text-[var(--invert-text)]"
                  : "border-line bg-surface text-ink-2 hover:text-ink",
                ].join(" ")}
              >
                <span className="text-[15px] leading-none">{c.symbol}</span>
                <span className="mt-1 leading-none">{c.id}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
          All amounts use this currency. Changing it doesn’t convert the numbers.
        </p>
      </section>

      <DocumentItemsEditor
        mode={mode}
        onModeChange={setMode}
        showQuantity={showQuantity}
        onShowQuantityChange={setShowQuantity}
        quantityLabel={quantityLabel}
        onQuantityLabelChange={setQuantityLabel}
        currency={currency}
        items={items}
        onItemsChange={setItems}
        error={fieldErrors.items}
      />

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="text-[14px] font-medium text-ink">Totals</h2>
        <div className="mt-3 space-y-2.5 text-[14px]">
          <div className="flex justify-between text-ink-2">
            <span>Subtotal</span>
            <span className="num text-ink">{formatKobo(subtotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="discount" className="text-ink-2">
              Discount
            </label>
            <div className="relative w-[140px]">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">{currencySymbol(currency)}</span>
              <input
                id="discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="min-h-10 w-full rounded-lg border border-line bg-surface pl-6 pr-2 text-right text-[14px] num text-ink"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="tax" className="text-ink-2">
              VAT / tax
            </label>
            <div className="relative w-[140px]">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">{currencySymbol(currency)}</span>
              <input
                id="tax"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="min-h-10 w-full rounded-lg border border-line bg-surface pl-6 pr-2 text-right text-[14px] num text-ink"
              />
            </div>
          </div>
          {mode === "product" && (
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="delivery" className="text-ink-2">
                Delivery fee
              </label>
              <div className="relative w-[140px]">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">{currencySymbol(currency)}</span>
                <input
                  id="delivery"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="min-h-10 w-full rounded-lg border border-line bg-surface pl-6 pr-2 text-right text-[14px] num text-ink"
                />
              </div>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-line pt-2.5">
            <span className="font-medium text-ink">Total</span>
            <span className="num text-[19px] font-medium text-ink">{formatKobo(total, currency)}</span>
          </div>
        </div>
      </section>

      {type === "receipt" && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-[14px] font-medium text-ink">Payment</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-line bg-surface-2 px-3.5 py-3">
              <span className="text-[13px] text-ink-2">Amount paid</span>
              <span className="num text-[15px] font-medium text-[var(--success)]">
                {formatKobo(total, currency)}
              </span>
            </div>
            <div>
              <label htmlFor="payment-method" className="mb-1.5 block text-[13.5px] font-medium text-ink">
                Payment method
              </label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink"
              >
                {["Bank transfer", "Cash", "Card", "USSD", "Mobile money", "Cheque", "Other"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-ink-3">
            A receipt proves the customer paid in full. Part-payment coming? Make an{" "}
            <strong className="font-medium text-ink-2">invoice</strong> instead — every payment you
            record on it turns into its own receipt.
          </p>
        </section>
      )}

      {type === "invoice" && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-[14px] font-medium text-ink">Payment terms</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field
              label="Due date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              hint="When you expect the money."
            />
            <div>
              <label htmlFor="payment-terms" className="mb-1.5 block text-[13.5px] font-medium text-ink">
                Terms
              </label>
              <select
                id="payment-terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink"
              >
                <option value="">No terms</option>
                <option value="Due on receipt">Due on receipt</option>
                <option value="Payment due within 7 days">Within 7 days</option>
                <option value="Payment due within 14 days">Within 14 days</option>
                <option value="Payment due within 30 days">Within 30 days</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="payment-instructions" className="mb-1.5 block text-[13.5px] font-medium text-ink">
              Payment instructions
            </label>
            <textarea
              id="payment-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Bank / wire details, or a payment link from your provider"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-4"
            />
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
            Add details for an account or payment service you already use that accepts {currency}.
            These instructions are shown to your customer; Rela doesn’t collect the payment.
            Set reusable instructions in Settings.
          </p>
        </section>
      )}

      {type === "quotation" && (
        <section className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="text-[14px] font-medium text-ink">Validity</h2>
          <div className="mt-3">
            <Field
              label="Valid until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              hint="Quotations usually stay open for 14 to 30 days."
            />
            <div className="mt-3">
              <label htmlFor="payment-instructions" className="mb-1.5 block text-[13.5px] font-medium text-ink">
                Payment instructions
              </label>
              <textarea
                id="payment-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Bank / wire details, or a payment link from your provider"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-ink-4"
              />
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">
                How the customer pays if they accept — carried over when this becomes an invoice.
              </p>
            </div>
          </div>
        </section>
      )}

      <div className="sticky bottom-0 -mx-5 border-t border-line bg-canvas/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn btn-primary btn-block"
          aria-busy={pending}
        >
          {pending ? "Saving…" : type === "receipt" ? "Save receipt" : `Save ${meta.label.toLowerCase()}`}
        </button>
        <p className="mt-2 text-center text-[11.5px] text-ink-3">
          Numbers are assigned automatically — {meta.prefix}-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-0001
        </p>
      </div>
    </div>
  );
}
