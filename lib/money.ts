/**
 * Money is always stored and passed around as integer minor units
 * (kobo, cents, pence — all are 1/100 of the unit).
 * ₦1,000.00 === 100000. Never use floats for persisted money.
 */

export const CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

const CURRENCY_META: Record<Currency, { label: string; symbol: string; locale: string }> = {
  NGN: { label: "Nigerian naira", symbol: "₦", locale: "en-NG" },
  USD: { label: "US dollar", symbol: "$", locale: "en-US" },
  GBP: { label: "British pound", symbol: "£", locale: "en-GB" },
  EUR: { label: "Euro", symbol: "€", locale: "en-IE" },
};

const formatters = new Map<string, Intl.NumberFormat>();
const exactFormatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: Currency): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(CURRENCY_META[currency].locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formatters.set(currency, f);
  }
  return f;
}

function exactFormatter(currency: Currency): Intl.NumberFormat {
  let f = exactFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(CURRENCY_META[currency].locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    exactFormatters.set(currency, f);
  }
  return f;
}

/** Coerce any persisted value to a known currency; NGN is the origin default. */
export function asCurrency(value: string | null | undefined): Currency {
  return (CURRENCIES as readonly string[]).includes(value ?? "") ? (value as Currency) : "NGN";
}

export function currencySymbol(currency: Currency): string {
  return CURRENCY_META[currency].symbol;
}

/** 100000 -> "₦1,000" / "$1,000" ; 100050 -> "₦1,000.50" / "$1,000.50" */
export function formatKobo(kobo: number, currency: Currency = "NGN"): string {
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(Math.round(kobo));
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  return fraction === 0
    ? `${sign}${formatter(currency).format(whole)}`
    : `${sign}${exactFormatter(currency).format(abs / 100)}`;
}

/** "1,000.50" or "1000" -> integer minor units. Returns null for invalid input. */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦$£€,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const kobo = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(kobo) ? kobo : null;
}
