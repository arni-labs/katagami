"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { KeyRound, LogIn, LogOut, UserRound } from "lucide-react";
import { CHROME_STAMP, CHROME_STAMP_LABEL } from "@/lib/chrome-stamp";
import { fetchSessionMe, sessionMeEpoch, subscribeSessionMe } from "@/lib/session-me";

// Header identity chip — same chrome-stamp as search / theme / menu.
// Signed out it's a "sign in" stamp; signed in it's your avatar opening a
// small paper menu (account, sign out). Owner mode stays separate at /owner.
//
// The session is fetched client-side via the shared fetchSessionMe helper
// (one /api/auth/me request per page load, shared with the RUM user join):
// reading cookies() in the shared (site) layout would opt every route out of
// the full-route cache, and this chip is the only personalized element on
// most pages.

export type HeaderUser = { name: string; email: string; picture: string };

const MENU_ITEM =
  "flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 outline-none transition-colors data-[highlighted]:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] data-[highlighted]:text-foreground";

export function UserMenu() {
  // undefined = still resolving; render a same-size blank so the header
  // doesn't jump when the answer arrives.
  const [user, setUser] = useState<HeaderUser | null | undefined>(undefined);
  const [owner, setOwner] = useState(false);
  const signOutForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let alive = true;
    const apply = (d: { user: HeaderUser | null; owner: boolean }) => {
      if (!alive) return;
      setUser(d.user);
      setOwner(d.owner);
    };
    // Epoch-guarded initial apply: a slow first fetch superseded by a
    // visibility resync must not land LAST and show a pre-revocation user.
    const before = sessionMeEpoch();
    void fetchSessionMe().then((d) => {
      if (before === sessionMeEpoch()) apply(d);
    });
    // Stay in step with RUM: any later resync (visibility,
    // sign-out-everywhere in another tab) that refetches the session also
    // updates the chip — otherwise RUM and the header drift apart.
    const unsubscribe = subscribeSessionMe(apply);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  if (user === undefined) {
    // Sized to the chrome-stamp / avatar so the header doesn't jump.
    return <span aria-hidden className="inline-block h-7 w-7" />;
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        aria-label="sign in"
        title="sign in"
        className={`${CHROME_STAMP} whitespace-nowrap text-[var(--ramune)]`}
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        <span className={`${CHROME_STAMP_LABEL} font-mono`}>sign in</span>
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <form
        ref={signOutForm}
        action="/api/auth/signout"
        method="post"
        className="hidden"
        aria-hidden
      />
      {owner ? (
        <Link
          href="/owner/visitor-shelf"
          prefetch={false}
          aria-label="visitor home"
          title="Pick languages on the signed-out home"
          className={`${CHROME_STAMP} whitespace-nowrap text-[var(--yuzu)]`}
        >
          <span className={`${CHROME_STAMP_LABEL} font-mono`}>visitor home</span>
        </Link>
      ) : null}
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          aria-label={`Account — ${user.name || user.email}`}
          // RUM auto-click tracking names actions after the accessible name;
          // without this override the visitor's NAME/EMAIL would ship as a
          // RUM action name — now joined to @usr.id (ARN-451). Keep the
          // aria-label personal for screen readers, keep telemetry generic.
          data-dd-action-name="account menu"
          title={user.name || user.email}
          className="inline-flex h-7 w-7 items-center justify-center transition-transform duration-200 hover:-translate-y-[1px] data-[state=open]:-translate-y-[1px]"
        >
          <UserAvatar user={user} size={28} />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={10}
          className="z-[70] w-64 bg-card p-2 shadow-[0_2px_4px_rgba(30,35,45,0.08),0_12px_32px_rgba(30,35,45,0.16)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center gap-2.5 px-2.5 pb-2.5 pt-2">
            <UserAvatar user={user} size={34} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                {user.name || user.email}
              </p>
              <p className="truncate font-mono text-[10px] lowercase tracking-[0.04em] text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <div className="sticker-perforation mx-1" />
          <div className="pt-1.5">
            <Dropdown.Item asChild>
              <Link href="/account" className={MENU_ITEM}>
                <UserRound className="h-3.5 w-3.5" aria-hidden />
                account
              </Link>
            </Dropdown.Item>
            <Dropdown.Item asChild>
              <Link href="/owner" className={MENU_ITEM}>
                <KeyRound className="h-3.5 w-3.5" aria-hidden />
                owner
              </Link>
            </Dropdown.Item>
            <Dropdown.Item
              className={MENU_ITEM}
              onSelect={(event) => {
                // Radix preventDefault on the item so the menu does not
                // swallow the navigation. The form lives outside the
                // portal — wrapping it in Item asChild blocked submit.
                event.preventDefault();
                signOutForm.current?.submit();
              }}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              sign out
            </Dropdown.Item>
          </div>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
    </span>
  );
}

export function UserAvatar({
  user,
  size,
}: {
  user: Pick<HeaderUser, "name" | "email" | "picture">;
  size: number;
}) {
  if (user.picture) {
    return (
      <Image
        src={user.picture}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full shadow-[0_1px_2px_rgba(30,35,45,0.22)]"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
      className="grid place-items-center rounded-full bg-[var(--teal)] font-mono font-bold text-background"
    >
      {(user.name || user.email).charAt(0).toUpperCase()}
    </span>
  );
}
