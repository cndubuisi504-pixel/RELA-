"use client";

import { useId, type InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, className = "", id, ...props }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {label}
        {props.required && <span className="ml-0.5 text-[var(--accent-text)]">*</span>}
      </label>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={[
          "min-h-12 w-full rounded-xl border bg-surface px-3.5 text-[15.5px] text-ink",
          "placeholder:text-ink-3/70 transition-colors",
          error ? "border-[var(--danger)]" : "border-line hover:border-[var(--border-strong)]",
          className,
        ].join(" ")}
        {...props}
      />
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-[12.5px] leading-snug text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-[12.5px] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  hint,
  error,
  rows = 3,
  className = "",
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = [hint ? `${fieldId}-hint` : null, error ? `${fieldId}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-[13.5px] font-medium text-ink">
        {label}
        {props.required && <span className="ml-0.5 text-[var(--accent-text)]">*</span>}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={[
          "w-full rounded-xl border bg-surface px-3.5 py-3 text-[15.5px] leading-relaxed text-ink transition-colors placeholder:text-ink-3/70",
          error ? "border-[var(--danger)]" : "border-line hover:border-[var(--border-strong)]",
          className,
        ].join(" ")}
        {...props}
      />
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-[12.5px] leading-snug text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="mt-1.5 text-[12.5px] font-medium text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
