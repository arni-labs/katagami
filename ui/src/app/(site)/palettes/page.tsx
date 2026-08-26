import Link from "next/link";
import {
  countPaletteSystems,
  listFeaturedPaletteSystems,
  pagePaletteSystems,
} from "@/lib/odata";
import { toPaletteItem } from "@/lib/lane-items";
import { PageHero, Marker, HeroStat } from "@/components/page-hero";
import { InfinitePalettes } from "@/components/infinite-galleries";
import { PaletteCard } from "@/components/palette-card";
import { hasCuratorAccess } from "@/lib/owner";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Palettes — Katagami",
  description: "Curated color systems: roles, ramps, and contrast guidance.",
};

// Same lane grid the InfinitePalettes gallery uses, so the featured shelf and
// the full catalog read identically.
const LANE_GRID =
  "grid grid-cols-2 items-start gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4";

async function FullPaletteGallery({ canCurate }: { canCurate: boolean }) {
  // Published-only. Keyset-paginated + server-searched so the catalog stays fast
  // at any size — the first page renders here, the rest load on scroll.
  const [first, featuredRows] = await Promise.all([
    pagePaletteSystems({ limit: 48 }),
    listFeaturedPaletteSystems(),
  ]);
  const items = first.items.map(toPaletteItem);
  const featured = featuredRows.map(toPaletteItem);
  return (
    <InfinitePalettes
      featured={featured}
      initialItems={items}
      initialCursor={first.nextCursor}
      canArchive={canCurate}
    />
  );
}

// ARN-385: signed-out palettes is the owner-picked featured set only — no
// newest-first filler, no "load more" pagination. Search and paging stay behind
// sign-in, exactly like the /art-styles and /language teasers. The same gate is
// enforced in the gallery server actions (loadPalettePage, searchPalettesByMeaning).
async function FeaturedPaletteShelf({ total }: { total: number }) {
  const featured = (await listFeaturedPaletteSystems()).map(toPaletteItem);
  const shown = featured.length;
  return (
    <div className="space-y-10">
      {shown > 0 ? (
        <section className="space-y-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ramune)]">
            Visitor shelf
          </p>
          <div className={LANE_GRID}>
            {featured.map((p) => (
              <Link
                key={p.id}
                href={`/palettes/${p.id}`}
                prefetch={false}
                className="group block min-w-0"
              >
                <PaletteCard palette={p} />
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="sticker-card mx-auto max-w-md p-8 text-center text-sm text-muted-foreground">
          The public shelf is empty until an owner picks palettes for visitors.
        </div>
      )}
      <div className="pt-2">
        <span aria-hidden className="sticker-perforation block" />
        <p className="mt-6 text-center text-[15.5px] leading-relaxed text-muted-foreground sm:text-[17px]">
          {shown} of {total} palettes.{" "}
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

export default async function PalettesPage() {
  // Curator (owner|curator) sees the archive controls — the set Cedar grants
  // PaletteSystem.Archive to. Signed-out visitors get the owner-picked featured
  // shelf only — mirrors the art-style + language teasers and the read-MCP sample.
  const canCurate = await hasCuratorAccess();
  const full = await hasFullGalleryAccess();
  const total = await countPaletteSystems();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Color lane"
        eyebrowAccent="ramune"
        title={
          <>
            The <Marker color="ramune">palette</Marker> catalog
          </>
        }
        description="Curated color systems — semantic roles, tonal ramps, and contrast guidance. Pair any of these with a UI language and an art style in the Studio."
        rightSlot={<HeroStat value={total} label="palettes" accent="ramune" />}
      />
      <div className="mt-10">
        {full ? (
          <FullPaletteGallery canCurate={canCurate} />
        ) : (
          <FeaturedPaletteShelf total={total} />
        )}
      </div>
    </div>
  );
}
