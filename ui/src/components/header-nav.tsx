"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackNav } from "@/lib/analytics";
import { NAV_LINKS, isActiveNav } from "@/lib/nav";

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <div className="hidden min-w-0 flex-1 items-center gap-4 text-sm font-medium md:flex md:flex-none md:gap-4 lg:gap-5">
      {NAV_LINKS.map((l) => {
        const active = isActiveNav(l.href, pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            data-active={active}
            onClick={() => trackNav({ target: l.href, source: "header" })}
            className="ink-underline relative inline-block shrink-0 text-foreground/75 transition-colors hover:text-foreground data-[active=true]:text-foreground"
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
