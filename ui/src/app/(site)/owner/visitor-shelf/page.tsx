import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import {
  artStyleDisplayName,
  listArtStyles,
  listDesignLanguages,
  listPaletteSystems,
  listVisibleArtStyles,
  listVisibleDesignLanguages,
  listVisiblePaletteSystems,
  paletteDisplayName,
  type DesignLanguage,
  type LaneEntity,
} from "@/lib/odata";
import { isOwner } from "@/lib/owner";
import { Marker, PageHero } from "@/components/page-hero";
import { SectionHeading, StickyNote, WashiTape } from "@/components/scrapbook";
import {
  VisitorShelfPicker,
  type ShelfGroup,
  type ShelfRow,
} from "./shelf-picker";

export const dynamic = "force-dynamic";

function languageName(lang: DesignLanguage): string {
  return lang.fields.name || lang.fields.slug || lang.entity_id;
}

/** Build one shelf section: the on-shelf rows and the off-shelf catalog pool,
 *  both sorted by display name. */
function buildGroup(
  entitySet: ShelfGroup["entitySet"],
  label: string,
  onShelfRows: { id: string; name: string; slug: string }[],
  publishedRows: { id: string; name: string; slug: string }[],
): ShelfGroup {
  const onIds = new Set(onShelfRows.map((r) => r.id));
  const byName = (a: ShelfRow, b: ShelfRow) => a.name.localeCompare(b.name);
  return {
    entitySet,
    label,
    onShelf: [...onShelfRows].sort(byName),
    catalog: publishedRows.filter((r) => !onIds.has(r.id)).sort(byName),
  };
}

export default async function VisitorShelfPage() {
  if (!(await isOwner())) {
    redirect("/owner");
  }

  const [
    visLangs,
    pubLangs,
    visPalettes,
    pubPalettes,
    visArts,
    pubArts,
  ] = await Promise.all([
    listVisibleDesignLanguages(),
    listDesignLanguages("Status eq 'Published'"),
    listVisiblePaletteSystems(),
    listPaletteSystems("Status eq 'Published'"),
    listVisibleArtStyles(),
    listArtStyles("Status eq 'Published'"),
  ]);

  const langRow = (l: DesignLanguage) => ({
    id: l.entity_id,
    name: languageName(l),
    slug: l.fields.slug ?? "",
  });
  const paletteRow = (p: LaneEntity) => ({
    id: p.entity_id,
    name: paletteDisplayName(p.fields),
    slug: p.fields.slug ?? "",
  });
  const artRow = (a: LaneEntity) => ({
    id: a.entity_id,
    name: artStyleDisplayName(a.fields),
    slug: a.fields.slug ?? "",
  });

  const groups: ShelfGroup[] = [
    buildGroup(
      "DesignLanguages",
      "Design languages",
      visLangs.map(langRow),
      pubLangs.filter((l) => l.fields.name).map(langRow),
    ),
    buildGroup(
      "PaletteSystems",
      "Palettes",
      visPalettes.map(paletteRow),
      pubPalettes.filter((p) => p.fields.name).map(paletteRow),
    ),
    buildGroup(
      "ArtStyles",
      "Art styles",
      visArts.map(artRow),
      pubArts.filter((a) => a.fields.name).map(artRow),
    ),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-10">
      <Link
        href="/owner"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        owner mode
      </Link>

      <PageHero
        eyebrow={
          <>
            <span>visitor home</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              owner pick
            </span>
          </>
        }
        eyebrowAccent="yuzu"
        title={<Marker color="yuzu">Who sees what before sign-in</Marker>}
        description={
          <>
            People who are not logged in only see this set — design languages,
            palettes, and art styles alike. Nothing else fills in. Add or remove
            here, or use <strong>Visitor home</strong> on a gallery card while
            signed in as owner.
          </>
        }
      />

      <section className="relative">
        <WashiTape color="yuzu" rotate={-3} className="-left-3 -top-3" width={90} />
        <StickyNote className="p-5 sm:p-6">
          <SectionHeading eyebrow="how to pick" eyebrowColor="yuzu">
            <Marker color="yuzu">The visitor shelf</Marker>
          </SectionHeading>
          <ol className="mt-3 max-w-2xl list-decimal space-y-2 pl-5 text-[17px] leading-relaxed text-foreground">
            <li>Sign in with the owner Google account.</li>
            <li>
              Open this page from Owner mode, or stay on the signed-in
              gallery and tap <strong>Visitor home</strong> on a card.
            </li>
            <li>
              Only the items in the lists below appear at katagami.ai for
              people who are not signed in.
            </li>
          </ol>
        </StickyNote>
      </section>

      <VisitorShelfPicker groups={groups} />
    </div>
  );
}
