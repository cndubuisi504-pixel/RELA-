"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/branding/Logo";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { logOut } from "@/lib/auth/actions";

type NavItem = { href: string; label: string; hint?: string };

const primary: NavItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/documents", label: "Documents" },
  { href: "/upgrade", label: "Upgrade" },
  { href: "/analytics", label: "Analytics", hint: "Pro" },
  { href: "/support", label: "Support" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  children,
  businessName,
  ownerName,
  email,
}: {
  children: React.ReactNode;
  businessName: string;
  ownerName: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const initials = (ownerName || email)
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-dvh bg-canvas">
      <header
        className="sticky top-0 z-40 border-b border-line/80 backdrop-blur-xl"
        style={{ backgroundColor: "var(--header-bg)" }}
      >
        <div className="container-x grid h-16 grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center">
            <Link
              href="/settings"
              aria-label={`Profile — ${businessName}`}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-[13px] font-medium text-ink"
            >
              {initials || "R"}
            </Link>
          </div>

          <Logo href="/dashboard" markSize={22} textClassName="text-[20px]" />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink"
            >
              <MenuIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <main id="main" className="container-x pb-24 pt-5">
        {children}
      </main>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="anim-fade absolute inset-y-0 right-0 flex w-[86%] max-w-[360px] flex-col bg-surface shadow-[var(--shadow-2)]"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-medium text-ink">{businessName}</p>
                <p className="truncate text-[12px] text-ink-3">{email}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-2"
                aria-label="Close menu"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <nav aria-label="Application" className="flex-1 overflow-y-auto p-2">
              <ul>
                {primary.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={[
                          "flex min-h-[52px] items-center justify-between rounded-xl px-3 text-[16px]",
                          active ? "bg-[var(--primary-soft)] font-medium text-ink" : "text-ink hover:bg-surface-2",
                        ].join(" ")}
                      >
                        {item.label}
                        {item.hint && (
                          <span className="rounded-full border border-line px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
                            {item.hint}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-line p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <form action={logOut}>
                <button
                  type="submit"
                  className="flex min-h-[52px] w-full items-center rounded-xl px-3 text-left text-[16px] text-[var(--danger)] hover:bg-[var(--danger-bg)]"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
