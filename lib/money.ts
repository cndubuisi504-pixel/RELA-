/**
 * Money is always stored and passed around as integer kobo.
 * ₦1,000.00 === 100000 kobo. Never use floats for persisted money.
 */

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const nairaExact = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 100000 -> "₦1,000" ; 100050 -> "₦1,000.50" */
export function formatKobo(kobo: number): string {
  const sign = kobo < 0 ? "-" : "";
  const abs = Math.abs(Math.round(kobo));
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  return fraction === 0
    ? `${sign}${naira.format(whole)}`
    : `${sign}${nairaExact.format(abs / 100)}`;
}

/** "1,000.50" or "1000" -> integer kobo. Returns null for invalid input. */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  const kobo = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(kobo) ? kobo : null;
}
