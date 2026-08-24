"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackNav } from "@/lib/analytics";
import { isActiveNav } from "@/lib/nav";
import { useNavLinks } from "@/lib/use-owner-links";
import { LinkPending } from "@/components/link-pending";

export function HeaderNav() {
  const pathname = usePathname();
  const links = useNavLinks();
  return (
    <div className="hidden min-w-0 flex-1 items-center gap-4 text-sm font-medium lg:flex lg:flex-none lg:gap-5">
      {links.map((l) => {
        const active = isActiveNav(l.href, pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            prefetch={l.href.startsWith("/owner") ? false : true}
            data-active={active}
            onClick={() => trackNav({ target: l.href, source: "header" })}
            className="ink-underline relative inline-block shrink-0 text-foreground/75 transition-colors hover:text-foreground data-[active=true]:text-foreground"
          >
            {l.label}
            <LinkPending className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 animate-pulse bg-foreground/40" />
          </Link>
        );
      })}
    </div>
  );
}
