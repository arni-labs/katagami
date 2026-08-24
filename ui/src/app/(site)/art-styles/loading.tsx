import { CardGridSkeleton } from "@/components/gallery-skeleton";

export default function ArtStylesLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <div className="h-10 w-64 animate-pulse bg-muted/60" />
      <div className="mt-4 h-4 w-full max-w-lg animate-pulse bg-muted/40" />
      <div className="mt-10">
        <CardGridSkeleton />
      </div>
    </div>
  );
}
