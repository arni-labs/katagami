"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { trackNav } from "@/lib/analytics";
import { NAV_LINKS, isActiveNav } from "@/lib/nav";

/**
 * Mobile "everything" menu — a slide-in drawer reachable from the header that
 * lists ALL top-level sections (the same as the desktop nav). It complements
 * the bottom tab bar (a 4-item quick-access subset), which it never replaces:
 * the bar stays for the thumb, the drawer covers the rest (Lineage, Compare,
 * Bake-off…). Shown below lg (mobile + tablet); at lg+ the full inline header
 * nav is shown instead, where all the links fit without crowding.
 */
export function MobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [navPath, setNavPath] = useState(pathname);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Close the drawer when the route changes. Adjusting state during render via
  // a previous-value marker is the idiomatic pattern — not setState in effect.
  if (pathname !== navPath) {
    setNavPath(pathname);
    setOpen(false);
  }

  // While open: Esc closes, body scroll locks, focus moves into the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center text-foreground/80 transition-colors hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-0 z-50"
        >
          {/* ink-toned scrim — not pure black */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[color-mix(in_oklch,var(--sumi)_45%,transparent)] backdrop-blur-[2px] deck-deal"
          />

          {/* the sheet — sharp, borderless, paper + shadow */}
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col bg-card shadow-[var(--shadow-card-hover)] deck-deal">
            <div className="flex items-center justify-between px-6 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
              <span
                className="ink-stamp"
                style={{ ["--ink" as string]: "var(--sakura)" }}
              >
                menu
              </span>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center text-foreground/70 transition-colors hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <span aria-hidden className="sticker-perforation mx-6" />

            <nav
              aria-label="All sections"
              className="flex flex-col gap-1 overflow-y-auto px-5 py-5"
            >
              {NAV_LINKS.map((l) => {
                const active = isActiveNav(l.href, pathname);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    data-active={active}
                    onClick={() => {
                      trackNav({ target: l.href, source: "mobile-menu" });
                      setOpen(false);
                    }}
                    className="ink-underline relative inline-flex w-fit items-center py-2.5 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-foreground/80 transition-colors data-[active=true]:text-foreground"
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
