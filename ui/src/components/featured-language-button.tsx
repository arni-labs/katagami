"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Star } from "lucide-react";
import { setLanguageFeatured } from "@/app/actions";

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
    setError(null);
    startTransition(async () => {
      try {
        await setLanguageFeatured(
          id,
          nextFeatured,
          nextFeatured ? displayOrder : 0,
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update.");
      }
    });
  }

  return (
    <div className="absolute left-2 top-2 z-30">
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
        className="group/feature inline-flex h-8 items-center gap-1.5 rounded-[3px] border bg-background/90 px-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] shadow-[0_2px_8px_rgba(30,35,45,0.12)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:rotate-[-1deg] disabled:pointer-events-none disabled:opacity-60"
        style={{
          borderColor: featured
            ? "color-mix(in oklch, var(--sakura) 72%, var(--paper-tape-mix))"
            : "color-mix(in oklch, var(--sumire) 60%, var(--paper-tape-mix))",
          color: featured
            ? "color-mix(in oklch, var(--sakura), black 22%)"
            : "color-mix(in oklch, var(--sumire), black 12%)",
          background: featured
            ? "color-mix(in oklch, var(--sakura) 18%, var(--paper-tape-mix))"
            : "color-mix(in oklch, var(--sumire) 10%, var(--paper-tape-mix))",
        }}
      >
        {featured ? (
          <Sparkles className="h-3.5 w-3.5" />
        ) : (
          <Star className="h-3.5 w-3.5" />
        )}
        <span>{isPending ? "saving" : featured ? "featured" : "feature"}</span>
      </button>
      {error ? (
        <div className="mt-1 max-w-[180px] rounded-[3px] border border-destructive/25 bg-background/95 px-2 py-1 text-[11px] font-medium leading-tight text-destructive shadow-[0_2px_8px_rgba(30,35,45,0.12)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
