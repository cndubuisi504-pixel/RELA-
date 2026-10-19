/**
 * Validates internal redirect paths and prevents open redirects.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target || typeof target !== "string") return fallback;
  const trimmed = target.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") return fallback;
    if (parsed.pathname.includes("\\")) return fallback;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}
