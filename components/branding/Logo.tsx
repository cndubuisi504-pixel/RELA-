import Link from "next/link";

/**
 * The Rela mark: a table-like geometric glyph built from three strokes —
 * a document square, a desk line, and two legs. Reconstructed as SVG from the
 * supplied artwork so it stays crisp from favicon to billboard.
 * It is deliberately different from a vendor's uploaded logo.
 */
export function RelaMark({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={(size / 48) * 48}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <g stroke="url(#rela-mark-grad)" strokeWidth="3" strokeLinecap="butt">
        <rect x="16.5" y="5.5" width="15" height="16" />
        <path d="M4 21.5h40" />
        <path d="M5.6 21.5V43" />
        <path d="M16.5 21.5V38h24.9V21.5" />
        <path d="M29 21.5V38" />
        <path d="M41.4 38v5" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-medium tracking-[-0.045em] ${className}`}>
      rela<span className="text-[var(--primary)]">.</span>
    </span>
  );
}

export function Logo({
  href = "/",
  markSize = 26,
  className = "",
  textClassName = "text-[23px]",
  tone = "default",
}: {
  href?: string | null;
  markSize?: number;
  className?: string;
  textClassName?: string;
  tone?: "default" | "invert";
}) {
  const content = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <RelaMark size={markSize} />
      <Wordmark className={`${textClassName} ${tone === "invert" ? "text-invert-text" : "text-ink"}`} />
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="rela. — home"
      className="inline-flex min-h-11 items-center rounded-md focus-visible:outline-2"
    >
      {content}
    </Link>
  );
}

/** Global gradient definition. Rendered once in the root layout. */
export function BrandDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="rela-mark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D9B96A" />
          <stop offset="34%" stopColor="#F39B3F" />
          <stop offset="66%" stopColor="#FF6D29" />
          <stop offset="100%" stopColor="#C94B1A" />
        </linearGradient>
      </defs>
    </svg>
  );
}
