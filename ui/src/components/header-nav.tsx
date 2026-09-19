"use client";

import Link from "next/link";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { trackNav } from "@/lib/analytics";
import { isActiveNav } from "@/lib/nav";
import { useNavLinks } from "@/lib/use-owner-links";
import { LinkPending } from "@/components/link-pending";

export function HeaderNav() {
  const pathname = usePathname();
  const all = useNavLinks();
  // The owner's sections sit behind one menu entry: set inline, seven extra
  // links pushed search, theme and the account menu off the right edge.
  const links = all.filter((l) => !l.owner);
  const ownerLinks = all.filter((l) => l.owner);
  const ownerActive = ownerLinks.some((l) => isActiveNav(l.href, pathname));
  return (
    <div className="hidden min-w-0 flex-1 items-center gap-4 text-sm font-medium lg:flex lg:flex-none lg:gap-3.5 xl:gap-5">
      {links.map((l) => {
        const active = isActiveNav(l.href, pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            prefetch={l.href.startsWith("/owner") ? false : true}
            data-active={active}
            onClick={() => trackNav({ target: l.href, source: "header" })}
            title={l.owner ? "Owner-only — the public never sees this" : undefined}
            className={
              l.owner
                ? // Owner marker is the sakura DOT below; the label stays
                  // foreground so it clears WCAG contrast (sakura-on-white was ~2.4:1).
                  "ink-underline relative inline-flex shrink-0 items-center gap-1.5 text-foreground/75 transition-colors hover:text-foreground data-[active=true]:text-foreground"
                : "ink-underline relative inline-block shrink-0 text-foreground/75 transition-colors hover:text-foreground data-[active=true]:text-foreground"
            }
          >
            {l.owner ? (
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sakura)]"
              />
            ) : null}
            {l.label}
            <LinkPending className="pointer-events-none absolute inset-x-0 -bottom-1 h-0.5 animate-pulse bg-foreground/40" />
          </Link>
        );
      })}
      {ownerLinks.length > 0 ? (
        <Dropdown.Root>
          <Dropdown.Trigger
            data-active={ownerActive}
            title="Owner-only — the public never sees this"
            className="ink-underline relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-foreground/75 outline-none transition-colors hover:text-foreground focus-visible:text-foreground data-[active=true]:text-foreground data-[state=open]:text-foreground"
          >
            <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sakura)]" />
            Owner
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="start"
              sideOffset={10}
              className="z-[70] w-56 bg-card p-2 shadow-[0_2px_4px_rgba(30,35,45,0.08),0_12px_32px_rgba(30,35,45,0.16)]"
            >
              {ownerLinks.map((l) => (
                <Dropdown.Item key={l.href} asChild>
                  <Link
                    href={l.href}
                    prefetch={false}
                    data-active={isActiveNav(l.href, pathname)}
                    onClick={() => trackNav({ target: l.href, source: "header" })}
                    className="block cursor-pointer px-2.5 py-2 text-[14.5px] text-foreground/80 outline-none transition-colors data-[active=true]:font-semibold data-[active=true]:text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground"
                  >
                    {l.label}
                  </Link>
                </Dropdown.Item>
              ))}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      ) : null}
    </div>
  );
}
