/** Instant route shell so a click is not a multi-second blank tab. */

export function CardGridSkeleton({
  count = 8,
  className = "grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="sticker-card overflow-hidden">
          <div className="animate-pulse bg-muted/60" style={{ aspectRatio: "16 / 10" }} />
          <div className="space-y-2 px-3.5 py-3">
            <div className="h-4 w-2/3 animate-pulse bg-muted/60" />
            <div className="h-2.5 w-1/3 animate-pulse bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  );
}
