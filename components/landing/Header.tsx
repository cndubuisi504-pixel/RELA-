"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/branding/Logo";
import { ThemeToggle } from "@/components/branding/ThemeToggle";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";

const links = [
  { href: "/#pricing", label: "Pricing" },
  { href: "/api-docs", label: "API Docs" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-line/80 backdrop-blur-xl"
      style={{ backgroundColor: "var(--header-bg)" }}
    >
      <div className="container-x flex h-16 items-center justify-between gap-6 md:h-[72px]">
        <Logo markSize={25} textClassName="text-[22px]" />

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-[15px] text-ink-2 transition-colors hover:bg-surface/70 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-[15px] text-ink-2 transition-colors hover:text-ink"
          >
            Log in
          </Link>
          <Link href="/signup" className="btn btn-primary btn-sm">
            Start free
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/60 text-ink"
          >
            {open ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="anim-fade border-b border-line bg-surface shadow-[var(--shadow-2)] md:hidden"
        >
          <nav aria-label="Mobile" className="container-x flex flex-col py-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex min-h-12 items-center rounded-xl px-2 text-[17px] text-ink hover:bg-surface-2"
              >
                {l.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-line" />
            <Link
              href="/login"
              className="flex min-h-12 items-center rounded-xl px-2 text-[17px] text-ink hover:bg-surface-2"
            >
              Log in
            </Link>
            <div className="pb-4 pt-2">
              <Link href="/signup" className="btn btn-primary btn-block">
                Start free — 5 free documents
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
