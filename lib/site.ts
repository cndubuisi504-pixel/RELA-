export const site = {
  name: "rela.",
  shortName: "Rela",
  tagline: "Create receipts, invoices & quotations in seconds.",
  description:
    "Rela helps businesses and freelancers create professional documents, share them with customers, and keep every payment record organized.",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "therelasolutions@gmail.com",
  whatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "2349153230482",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // Platform owner. Only this account can reach /admin (enforced server-side).
  adminEmail: process.env.ADMIN_EMAIL ?? "chimdindundubuisirich@gmail.com",
} as const;

export const whatsappLink = `https://wa.me/${site.whatsapp}`;
export const xUrl = "https://x.com/therelasol";
