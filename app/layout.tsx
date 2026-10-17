import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { BrandDefs } from "@/components/branding/Logo";
import { site } from "@/lib/site";
import "./globals.css";

const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Satoshi-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const inter = localFont({
  src: [{ path: "./fonts/InterLatin.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "rela. — Create receipts, invoices & quotations in seconds",
    template: "%s · rela.",
  },
  description: site.description,
  applicationName: "rela.",
  openGraph: {
    type: "website",
    siteName: "rela.",
    title: "rela. — Business documents in seconds",
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "rela. — Business documents in seconds",
    description: site.description,
  },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFBF6" },
    { media: "(prefers-color-scheme: dark)", color: "#161316" },
  ],
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('rela-theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <body className={`${satoshi.variable} ${inter.variable}`}>
        <Script id="rela-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <BrandDefs />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
