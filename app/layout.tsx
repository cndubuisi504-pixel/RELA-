import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { BrandDefs } from "@/components/branding/Logo";
import { SiteLogoProvider } from "@/components/branding/LogoContext";
import { getSiteLogoUrl } from "@/lib/site/logo-server";
import { site } from "@/lib/site";
import "./globals.css";


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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteLogoUrl = await getSiteLogoUrl();
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <body>
        <Script id="rela-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <BrandDefs />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteLogoProvider logoUrl={siteLogoUrl}>{children}</SiteLogoProvider>
      </body>
    </html>
  );
}
