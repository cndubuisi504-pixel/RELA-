import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // never index private areas or verification tokens
        disallow: ["/dashboard", "/documents", "/settings", "/admin", "/r/", "/api/"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
