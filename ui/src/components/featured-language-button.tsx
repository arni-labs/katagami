"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Star } from "lucide-react";
import { setLanguageFeatured } from "@/app/actions";

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

export function FeaturedLanguageButton({
  id,
  name,
  featured,
  displayOrder = 0,
}: {
  id: string;
  name: string;
  featured: boolean;
  displayOrder?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextFeatured = !featured;

  function toggleFeatured() {
    const viewportPosition = currentViewportPosition();
    setError(null);
    startTransition(async () => {
      try {
        await setLanguageFeatured(
          id,
          nextFeatured,
          nextFeatured ? displayOrder : 0,
        );
        router.refresh();
        restoreViewportPosition(viewportPosition);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update.");
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={featured}
        aria-label={`${featured ? "Unfeature" : "Feature"} ${name}`}
        title={`${featured ? "Unfeature" : "Feature"} ${name}`}
        disabled={isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFeatured();
        }}
        className="group/feature relative flex h-7 w-7 items-center justify-center rounded-[3px] shadow-[0_1px_0_rgba(30,35,45,0.08)] transition-all hover:-translate-y-0.5 hover:rotate-[-3deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklch,var(--sumire)_40%,transparent)] disabled:pointer-events-none disabled:opacity-60"
        style={{
          color: featured
            ? "color-mix(in oklch, var(--sakura) 72%, var(--foreground))"
            : "color-mix(in oklch, var(--sumire) 72%, var(--foreground))",
          background: featured
            ? "color-mix(in srgb, var(--sakura) 14%, var(--paper-stamp-mix))"
            : "color-mix(in srgb, var(--sumire) 14%, var(--paper-stamp-mix))",
        }}
      >
        <span
          aria-hidden
          className="absolute -left-1 -top-1 h-2 w-2 rounded-full opacity-90 transition-transform group-hover/feature:scale-125"
          style={{
            background: featured ? "var(--yuzu)" : "var(--sumire)",
          }}
        />
        {featured ? (
          <Sparkles className="h-3.5 w-3.5" />
        ) : (
          <Star className="h-3.5 w-3.5" />
        )}
        <span className="sr-only">
          {isPending ? "Saving" : featured ? "Featured" : "Feature"}
        </span>
      </button>
      {error ? (
        <div
          className="absolute left-0 top-9 z-40 w-44 rounded-[3px] bg-background/95 px-2 py-1 text-[11px] font-medium leading-tight text-destructive"
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
