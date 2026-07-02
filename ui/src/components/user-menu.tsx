"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/auth-actions";

// Header identity chip — the human counterpart of the theme stamp next to it.
// Signed out it's a "sign in" stamp; signed in it's your avatar opening a
// small paper menu (account, sign out). Owner mode stays separate at /owner.
//
// The session is fetched client-side from /api/auth/me: reading cookies()
// in the shared (site) layout would opt every route out of the full-route
// cache, and this chip is the only personalized element on most pages.

export type HeaderUser = { name: string; email: string; picture: string };

const MENU_ITEM =
  "flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-foreground/80 outline-none transition-colors data-[highlighted]:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] data-[highlighted]:text-foreground";

export function UserMenu() {
  const [, startTransition] = useTransition();
  // undefined = still resolving; render a same-size blank so the header
  // doesn't jump when the answer arrives.
  const [user, setUser] = useState<HeaderUser | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d: { user: HeaderUser | null }) => {
        if (alive) setUser(d.user ?? null);
      })
      .catch(() => {
        if (alive) setUser(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (user === undefined) {
    return <span aria-hidden className="inline-block h-7 w-7" />;
  }

  if (!user) {
    return (
      <Link
        href="/signin"
        aria-label="sign in"
        title="sign in"
        className="stamp inline-flex h-7 items-center gap-1.5 whitespace-nowrap px-2.5 text-[var(--teal)] transition-transform duration-200 hover:-translate-y-[1px] hover:rotate-[-6deg]"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden />
        {/* icon-only below sm — the mobile header row is already full */}
        <span
          className="hidden font-mono sm:inline"
          style={{ fontSize: 11, letterSpacing: "0.08em", lineHeight: 1 }}
        >
          sign in
        </span>
      </Link>
    );
  }

  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          aria-label={`Account — ${user.name || user.email}`}
          title={user.name || user.email}
          className="inline-flex h-8 w-8 items-center justify-center transition-transform duration-200 hover:-translate-y-[1px] data-[state=open]:-translate-y-[1px]"
        >
          <UserAvatar user={user} size={26} />
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
            <Dropdown.Item
              className={MENU_ITEM}
              onSelect={() =>
                startTransition(async () => {
                  // The layout persists through the action's client-side
                  // redirect, so flip the chip ourselves.
                  setUser(null);
                  await signOut();
                })
              }
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              sign out
            </Dropdown.Item>
          </div>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
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
