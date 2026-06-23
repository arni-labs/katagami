"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { track } from "@/lib/analytics";

type LinkProps = ComponentProps<typeof Link>;

/** A next/link that fires a Datadog RUM custom action on click before
 *  navigating. Use for links whose click we want to attribute (e.g. which
 *  surface drove a language visit). Any extra Link props pass straight
 *  through, so it is a drop-in replacement for <Link>. */
export function TrackedLink({
  event,
  data,
  onClick,
  children,
  ...rest
}: LinkProps & {
  event: string;
  data?: Record<string, string | number | boolean | undefined>;
  children: ReactNode;
}) {
  return (
    <Link
      {...rest}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        track(event, data ?? {});
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}
