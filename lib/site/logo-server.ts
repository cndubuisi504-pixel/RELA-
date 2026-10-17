import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

/**
 * The custom site logo the founder set in /admin, or null for the default
 * rela. mark. Publicly readable, cookie-free, cached — safe to call from any
 * server component; the cache is busted by revalidateTag("site-settings").
 */
export const getSiteLogoUrl = unstable_cache(
  async (): Promise<string | null> => {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await db
      .from("site_settings")
      .select("logo_url")
      .eq("id", true)
      .maybeSingle();
    return (data?.logo_url as string | null) ?? null;
  },
  ["site-settings"],
  { tags: ["site-settings"], revalidate: 300 },
);
