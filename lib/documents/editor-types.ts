export type EditorItem = {
  key: string;
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type EditorMode = "product" | "service";
export type QuantityLabel = "qty" | "hours" | "days" | "projects" | "sessions";

export const quantityLabels: { id: QuantityLabel; label: string }[] = [
  { id: "qty", label: "Qty" },
  { id: "hours", label: "Hours" },
  { id: "days", label: "Days" },
  { id: "projects", label: "Projects" },
  { id: "sessions", label: "Sessions" },
];

export function newItem(): EditorItem {
  return {
    key: Math.random().toString(36).slice(2, 10),
    name: "",
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

export function lineTotal(item: EditorItem, showQuantity: boolean): number {
  const price = Number(item.unitPrice.replace(/[₦$£€,\s]/g, "")) || 0;
  const qty = showQuantity ? Number(item.quantity) || 0 : 1;
  return Math.round(price * 100) * Math.round(qty * 1000) / 1000;
}

/** Minor units stored as integers; prices entered in the selected currency. */
export function lineTotalKobo(item: EditorItem, showQuantity: boolean): number {
  const naira = Number(item.unitPrice.replace(/[₦$£€,\s]/g, "")) || 0;
  const qty = showQuantity ? Number(item.quantity) || 0 : 1;
  return Math.round(naira * 100 * qty);
}

/** Currency chips shown in the editor. */
export const currencyOptions: { id: "NGN" | "USD" | "GBP" | "EUR"; label: string; symbol: string }[] = [
  { id: "NGN", label: "Naira", symbol: "₦" },
  { id: "USD", label: "US dollar", symbol: "$" },
  { id: "GBP", label: "Pound", symbol: "£" },
  { id: "EUR", label: "Euro", symbol: "€" },
];
