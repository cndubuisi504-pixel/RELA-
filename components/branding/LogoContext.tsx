"use client";

import { createContext, useContext, type ReactNode } from "react";

const SiteLogoContext = createContext<string | null>(null);

/** Value comes from the root layout (server) → custom logo appears even in SSR HTML. */
export function SiteLogoProvider({
  logoUrl,
  children,
}: {
  logoUrl: string | null;
  children: ReactNode;
}) {
  return <SiteLogoContext.Provider value={logoUrl}>{children}</SiteLogoContext.Provider>;
}

export function useSiteLogo(): string | null {
  return useContext(SiteLogoContext);
}
