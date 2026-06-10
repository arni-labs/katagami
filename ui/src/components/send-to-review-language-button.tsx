"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { sendLanguageToReview } from "@/app/actions";

interface ViewportPosition {
  left: number;
  top: number;
}

function currentViewportPosition(): ViewportPosition {
  return {
    left: window.scrollX,
    top: window.scrollY,
  };
}

function restoreViewportPosition(position: ViewportPosition) {
  const root = document.documentElement;
  const body = document.body;
  const previousRootBehavior = root.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";

  const restore = () => window.scrollTo(position.left, position.top);
  restore();
  window.requestAnimationFrame(restore);
  for (const delay of [80, 180, 360, 720]) {
    window.setTimeout(restore, delay);
  }
  window.setTimeout(() => {
    root.style.scrollBehavior = previousRootBehavior;
    body.style.scrollBehavior = previousBodyBehavior;
  }, 760);
}

export function SendToReviewLanguageButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function sendToReview() {
    const viewportPosition = currentViewportPosition();
    setError(null);
    startTransition(async () => {
      try {
        await sendLanguageToReview(id);
        router.refresh();
        restoreViewportPosition(viewportPosition);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send to review.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Send ${name} to review`}
        title={`Send ${name} to review`}
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sendToReview();
        }}
        className="group/review relative flex h-7 w-7 items-center justify-center rounded-[3px] bg-[color-mix(in_srgb,var(--ramune)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--ramune)_72%,var(--foreground))] shadow-[0_1px_0_rgba(30,35,45,0.08)] transition-all hover:-translate-y-0.5 hover:rotate-[-2deg] hover:bg-[color-mix(in_oklch,var(--ramune)_82%,white_8%)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--ramune)_42%,transparent)] disabled:pointer-events-none disabled:opacity-60"
      >
        <span
          aria-hidden
          className="absolute -right-1 -bottom-1 h-2 w-2 rounded-full bg-[var(--ramune)] opacity-0 transition-opacity group-hover/review:opacity-100"
        />
        <Undo2 className="h-3.5 w-3.5" />
        <span className="sr-only">{isPending ? "Sending" : "Send to review"}</span>
      </button>
      {error ? (
        <div
          className="absolute right-0 top-9 z-40 w-48 rounded-[3px] bg-background/95 px-2 py-1 text-[11px] font-medium leading-tight text-destructive"
          style={{
            boxShadow: "var(--shadow-card)",
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
