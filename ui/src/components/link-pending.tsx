"use client";

import { useLinkStatus } from "next/link";

/** Instant click affordance. Lives inside a next/link so a slow RSC
 *  payload is not a multi-second "did that register?" blank. */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className={
        className ??
        "pointer-events-none absolute inset-0 animate-pulse bg-foreground/6"
      }
    />
  );
}
