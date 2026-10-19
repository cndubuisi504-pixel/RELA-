"use client";

import { useId } from "react";
import { formatKobo, currencySymbol, type Currency } from "@/lib/money";
import {
  lineTotalKobo,
  newItem,
  quantityLabels,
  type EditorItem,
  type EditorMode,
  type QuantityLabel,
} from "@/lib/documents/editor-types";
import { PlusIcon, CloseIcon } from "@/components/ui/icons";

type Props = {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  showQuantity: boolean;
  onShowQuantityChange: (value: boolean) => void;
  quantityLabel: QuantityLabel;
  onQuantityLabelChange: (label: QuantityLabel) => void;
  items: EditorItem[];
  onItemsChange: (items: EditorItem[]) => void;
  error?: string | null;
  currency?: Currency;
};

const inputBase =
  "w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[14px] text-ink placeholder:text-ink-3/70 focus:border-[var(--border-strong)]";

export function DocumentItemsEditor({
  mode,
  onModeChange,
  showQuantity,
  onShowQuantityChange,
  quantityLabel,
  onQuantityLabelChange,
  items,
  onItemsChange,
  error,
  currency = "NGN",
}: Props) {
  // DOM ids come from useId, not the row key: keys are random and would differ
  // between the server render and hydration.
  const uid = useId();
  const isService = mode === "service";
  const quantityEnabled = !isService || showQuantity;
  const label = quantityLabels.find((q) => q.id === quantityLabel)?.label ?? "Qty";

  function update(index: number, patch: Partial<EditorItem>) {
    onItemsChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function remove(index: number) {
    if (items.length === 1) {
      onItemsChange([newItem()]);
      return;
    }
    onItemsChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onItemsChange(next);
  }

  function add() {
    onItemsChange([...items, newItem()]);
  }

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <div className="border-b border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[14px] font-medium text-ink">Items</h2>
          <div role="group" aria-label="Document mode" className="flex rounded-full border border-line bg-surface-2 p-0.5">
            {(["product", "service"] as EditorMode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => onModeChange(m)}
                className={[
                  "min-h-9 rounded-full px-3 text-[12.5px] font-medium capitalize transition-colors",
                  mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3",
                ].join(" ")}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {isService && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
            <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
              <input
                type="checkbox"
                checked={showQuantity}
                onChange={(e) => onShowQuantityChange(e.target.checked)}
                className="h-4 w-4 rounded border-line accent-[var(--primary)]"
              />
              Show quantity
            </label>

            {showQuantity && (
              <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <span className="sr-only">Quantity label</span>
                <select
                  value={quantityLabel}
                  onChange={(e) => onQuantityLabelChange(e.target.value as QuantityLabel)}
                  className="min-h-9 rounded-lg border border-line bg-surface px-2 text-[12.5px] text-ink"
                  aria-label="Quantity label"
                >
                  {quantityLabels.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        {/* Desktop header */}
        <div className="mb-1 hidden gap-2 px-1 text-[11px] uppercase tracking-[0.1em] text-ink-3 sm:grid sm:grid-cols-[1fr_88px_120px_92px_28px]">
          <span>{isService ? "Service" : "Item"}</span>
          {quantityEnabled && <span className="text-center">{label}</span>}
          <span className="text-right">{isService ? "Rate" : "Unit price"}</span>
          <span className="text-right">Amount</span>
          <span />
        </div>

        <ul className="space-y-2">
          {items.map((item, index) => {
            const total = lineTotalKobo(item, quantityEnabled);
            return (
              <li
                key={item.key}
                className="rounded-xl border border-line bg-canvas/40 p-2.5 sm:border-0 sm:bg-transparent sm:p-1"
              >
                <div
                  className={[
                    "grid gap-2",
                    quantityEnabled
                      ? "sm:grid-cols-[1fr_88px_120px_92px_28px] sm:items-center"
                      : "sm:grid-cols-[1fr_120px_92px_28px] sm:items-center",
                  ].join(" ")}
                >
                  <div className="space-y-1.5">
                    <label className="sr-only" htmlFor={`name-${uid}-${index}`}>
                      {isService ? "Service name" : "Item name"}
                    </label>
                    <input
                      id={`name-${uid}-${index}`}
                      value={item.name}
                      onChange={(e) => update(index, { name: e.target.value })}
                      placeholder={isService ? "Website design" : "Rice bag"}
                      className={inputBase}
                    />
                    {isService && (
                      <>
                        <label className="sr-only" htmlFor={`desc-${uid}-${index}`}>
                          Description
                        </label>
                        <textarea
                          id={`desc-${uid}-${index}`}
                          value={item.description}
                          onChange={(e) => update(index, { description: e.target.value })}
                          placeholder="E-commerce site, three revisions, delivery in seven days"
                          rows={2}
                          className={`${inputBase} resize-none`}
                        />
                      </>
                    )}
                  </div>

                  {quantityEnabled && (
                    <div>
                      <label className="mb-1 block text-[11px] text-ink-3 sm:hidden">{label}</label>
                      <input
                        value={item.quantity}
                        onChange={(e) => update(index, { quantity: e.target.value })}
                        inputMode="decimal"
                        aria-label={`${label} for row ${index + 1}`}
                        className={`${inputBase} text-center num`}
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-[11px] text-ink-3 sm:hidden">
                      {`${isService ? "Rate" : "Unit price"} (${currencySymbol(currency)})`}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-ink-3">
                        {currencySymbol(currency)}
                      </span>
                      <input
                        value={item.unitPrice}
                        onChange={(e) => update(index, { unitPrice: e.target.value })}
                        inputMode="decimal"
                        aria-label={`${isService ? "Rate" : "Unit price"} for row ${index + 1}`}
                        placeholder="0"
                        className={`${inputBase} num pl-6 text-right`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end">
                    <span className="text-[11px] text-ink-3 sm:hidden">Amount</span>
                    <span className="num text-[14px] font-medium text-ink">{formatKobo(total, currency)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-0.5">
                    <div className="flex sm:hidden">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Move row ${index + 1} up`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1}
                        aria-label={`Move row ${index + 1} down`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove row ${index + 1}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-[var(--danger-bg)] hover:text-[var(--danger)]"
                    >
                      <CloseIcon size={15} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="mt-2 text-[12.5px] font-medium text-[var(--danger)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={add}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-line px-3 text-[13px] font-medium text-[var(--accent-text)] hover:bg-surface-2"
        >
          <PlusIcon size={15} />
          Add {isService ? "service" : "item"}
        </button>
      </div>
    </section>
  );
}
