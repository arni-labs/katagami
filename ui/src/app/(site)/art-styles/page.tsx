import { Suspense } from "react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { countArtStyles, listArtStyles, pageArtStyles } from "@/lib/odata";
import { toArtStyleItem } from "@/lib/lane-items";
import { featuredIds } from "@/lib/catalog";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { InfiniteArtStyles } from "@/components/infinite-galleries";
import { ArtStyleCard } from "@/components/art-style-card";
import { CardGridSkeleton } from "@/components/gallery-skeleton";
import { hasCuratorAccess } from "@/lib/owner";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Art Styles — Katagami",
  description: "Engine-agnostic art-style recipes with portable, reference-independent prompts.",
};

const FIRST_PAGE = 24;

const cachedArtStyleFirstPage = unstable_cache(
  async () => {
    const first = await pageArtStyles({ limit: FIRST_PAGE });
    return {
      items: first.items.map(toArtStyleItem),
      nextCursor: first.nextCursor,
    };
  },
  ["art-style-gallery-first-v1"],
  { revalidate: 60 },
);

const cachedArtStyleCount = unstable_cache(
  () => countArtStyles(),
  ["art-style-gallery-count-v1"],
  { revalidate: 60 },
);

async function ArtStyleCount() {
  const total = await cachedArtStyleCount();
  return <HeroStat value={total} label="art styles" accent="sakura" />;
}

async function ArtStyleGrid({ canCurate }: { canCurate: boolean }) {
  const first = await cachedArtStyleFirstPage();
  return (
    <InfiniteArtStyles
      initialItems={first.items}
      initialCursor={first.nextCursor}
      canArchive={canCurate}
    />
  );
}

// Same lane grid the InfiniteArtStyles gallery uses, so the featured shelf and
// the full catalog read identically.
const LANE_GRID =
  "grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4";

// ARN-385: signed-out art-styles is the owner-picked featured set only — no
// newest-first filler, no "load more" pagination. Search and paging stay behind
// sign-in. The same gate is enforced in the gallery server actions.
async function FeaturedArtStyleShelf() {
  // ARN-385: the anonymous shelf is the WHOLE featured portion, read the same
  // uncapped way the MCP and ⌘K index read it — listArtStyles() (fully
  // paginated) filtered by the featuredIds() primitive — so it can never lag
  // behind them the way the older capped listFeaturedArtStyles() could.
  const [total, allRows, featuredSet] = await Promise.all([
    cachedArtStyleCount(),
    listArtStyles().catch(() => []),
    featuredIds("art_style"),
  ]);
  const featured = allRows
    .filter((r) => featuredSet.has(r.entity_id))
    .map(toArtStyleItem);
  const shown = featured.length;
  return (
    <div className="space-y-10">
      {shown > 0 ? (
        <section className="space-y-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sakura)]">
            Visitor shelf
          </p>
          <div className={LANE_GRID}>
            {featured.map((a) => (
              <Link
                key={a.id}
                href={`/art-styles/${a.id}`}
                prefetch={false}
                className="group block min-w-0"
              >
                <ArtStyleCard art={a} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
          The public shelf is empty until an owner picks art styles for visitors.
        </div>
      )}
      <div className="pt-2">
        <span aria-hidden className="sticker-perforation block" />
        <p className="mt-6 text-center text-[15.5px] leading-relaxed text-muted-foreground sm:text-[17px]">
          {shown} of {total} art styles.{" "}
          <Link
            href="/signin"
            className="marker relative inline-block text-foreground transition-transform duration-200 hover:-translate-y-[1px]"
          >
            <span
              aria-hidden
              className="marker-fill"
              style={{ background: "var(--yuzu)" }}
            />
            <span className="marker-text">Sign in</span>
          </Link>{" "}
          to keep exploring.
        </p>
      </div>
    </div>
  );
}

export default async function ArtStylesPage() {
  // Curator check (owner|curator — the set Cedar grants ArtStyle.Archive to) is
  // cookie-bound and must stay off the public cache. The catalog itself is
  // Published-only and is cached as a slim card page so a header click is not a
  // 4s Temper collection round-trip.
  const canCurate = await hasCuratorAccess();
  // Signed-out visitors get the owner-picked featured shelf only — mirrors the
  // language home teaser and the read-MCP anonymous sample.
  const full = await hasFullGalleryAccess();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Art lane"
        eyebrowAccent="sakura"
        title={
          <>
            The <Marker color="sakura">art style</Marker> catalog
          </>
        }
        description="Engine-agnostic style recipes built from portable aesthetic facts. Optional reference images illustrate the result; the prompt works without them."
        rightSlot={
          <Suspense fallback={<HeroStat value="…" label="art styles" accent="sakura" />}>
            <ArtStyleCount />
          </Suspense>
        }
      />
      <div className="mt-10">
        {full ? (
          <Suspense fallback={<CardGridSkeleton count={8} />}>
            <ArtStyleGrid canCurate={canCurate} />
          </Suspense>
        ) : (
          <Suspense fallback={<CardGridSkeleton count={8} />}>
            <FeaturedArtStyleShelf />
          </Suspense>
        )}
      </div>
    </div>
  );
}
