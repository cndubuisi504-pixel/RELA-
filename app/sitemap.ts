import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<[string, number]> = [
    ["", 1],
    ["/api-docs", 0.7],
    ["/support", 0.6],
    ["/terms", 0.3],
    ["/privacy", 0.3],
  ];

  return routes.map(([path, priority]) => ({
    url: `${site.url}${path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority,
  }));
}
