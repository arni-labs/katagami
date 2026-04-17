"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Gallery" },
  { href: "/taxonomy", label: "Taxonomy" },
  { href: "/lineage", label: "Lineage" },
  { href: "/compare", label: "Compare" },
];

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <div className="hidden min-w-0 flex-1 items-center gap-4 text-sm font-medium md:flex md:flex-none md:gap-5">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            className="ink-underline relative inline-block shrink-0 text-foreground/75 transition-colors hover:text-foreground data-[active=true]:text-foreground"
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
