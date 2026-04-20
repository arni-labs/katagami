"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Layers, GitBranch, GitCompare } from "lucide-react";

const tabs = [
  {
    href: "/",
    label: "Gallery",
    Icon: LayoutGrid,
    accent: "sakura" as const,
    match: (p: string) => p === "/",
  },
  {
    href: "/taxonomy",
    label: "Taxonomy",
    Icon: Layers,
    accent: "salad" as const,
    match: (p: string) => p.startsWith("/taxonomy"),
  },
  {
    href: "/lineage",
    label: "Lineage",
    Icon: GitBranch,
    accent: "ramune" as const,
    match: (p: string) => p.startsWith("/lineage"),
  },
  {
    href: "/compare",
    label: "Compare",
    Icon: GitCompare,
    accent: "sumire" as const,
    match: (p: string) => p.startsWith("/compare"),
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* washi tape peeking over the top edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 left-[18%] h-[12px] w-14 rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--yuzu) 75%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--yuzu) 35%, var(--paper-tape-mix)) 6px 12px)",
          transform: "rotate(-4deg)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-1.5 right-[14%] h-[10px] w-10 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--teal) 70%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--teal) 30%, var(--paper-tape-mix)) 6px 12px)",
          transform: "rotate(6deg)",
        }}
      />

      <ul className="relative flex items-stretch justify-around px-1 pb-1.5 pt-2">
        {tabs.map(({ href, label, Icon, accent, match }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group/tab relative flex flex-col items-center gap-0.5 px-1 py-1.5 text-foreground/70 transition-colors duration-150 active:text-foreground"
              >
                {/* active yuzu wash behind the cell */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-2 inset-y-1 -z-0 rounded-[3px]"
                    style={{
                      background: `color-mix(in oklch, var(--${accent}) 40%, var(--paper-tape-mix))`,
                      transform: "rotate(-0.8deg)",
                    }}
                  />
                )}

                <Icon
                  className={`relative h-5 w-5 transition-transform duration-200 ${
                    active
                      ? "scale-110 text-foreground"
                      : "text-foreground/70 group-active/tab:scale-95"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={`relative font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                    active ? "font-bold text-foreground" : "text-foreground/70"
                  }`}
                >
                  {label}
                </span>

                {/* tiny active dot */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-full"
                    style={{ background: `var(--${accent})` }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
