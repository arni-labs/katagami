import { cache } from "react";
import {
  listPaletteSystems,
  listArtStyles,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import {
  canRemixLanguage,
  remixIslandPaint,
  remixPageMountsIsland,
  remixStreamOutcome,
  type RemixCatalogs,
} from "@/lib/language-detail-stream";
import { LanguageSectionSkeleton } from "@/components/gallery-skeleton";
import { InlineRemix } from "@/components/remix/inline-remix";
import { RemixLaneBlurb } from "@/components/remix/remix-lane-blurb";
import { SectionHeading, Perforation } from "@/components/scrapbook";

export const loadLanguageRemixCatalogs = cache(async () => {
  const [palettes, arts] = await Promise.all([
    listPaletteSystems(),
    listArtStyles(),
  ]);
  return { palettes, arts };
});

/**
 * Sync island paint. Catalogs omitted = pending: LanguageSectionSkeleton
 * from landing+dashboard, before canRemixLanguage. Catalogs `[]` / throw
 * (catch-to-`[]`) = empty: null — no sibling pulse, no two h-72.
 *
 * The page does not pass catalogs. It streams LanguageRemixIslandResolved
 * behind fallback={this} so Bluet in-flight still pulses without awaiting
 * on LanguageDetailPage.
 */
export function LanguageRemixIsland({
  lang,
  catalogs,
}: {
  lang: DesignLanguage;
  catalogs?: RemixCatalogs;
}) {
  const pageOutcome = remixStreamOutcome(lang);
  const outcome = remixStreamOutcome(lang, catalogs);
  const paint = remixIslandPaint(
    outcome,
    remixPageMountsIsland(pageOutcome),
  );
  if (paint === "dark") return null;
  if (paint === "pulse") return <LanguageSectionSkeleton />;
  return <LanguageRemixSection lang={lang} catalogs={catalogs} />;
}

/** Lists, then the same island. Empty / throw paints dark — not a hide. */
export async function LanguageRemixIslandResolved({
  lang,
}: {
  lang: DesignLanguage;
}) {
  let catalogs: RemixCatalogs;
  try {
    catalogs = await loadLanguageRemixCatalogs();
  } catch {
    catalogs = { palettes: [], arts: [] };
  }
  return <LanguageRemixIsland lang={lang} catalogs={catalogs} />;
}

export async function LanguageRemixSection({
  lang,
  catalogs,
}: {
  lang: DesignLanguage;
  catalogs?: RemixCatalogs;
}) {
  const { palettes: paletteRows, arts: artRows } =
    catalogs ?? (await loadLanguageRemixCatalogs());
  if (!canRemixLanguage(lang, paletteRows, artRows)) {
    return null;
  }

  return (
    <section>
      <Perforation className="mb-8" />
      <SectionHeading eyebrow="remix lane" eyebrowColor="graphite">
        try a remix
      </SectionHeading>
      <RemixLaneBlurb name={lang.fields.name || "Untitled"} />
      <InlineRemix
        languages={toLanguageOpts([lang])}
        palettes={toPaletteOpts(paletteRows)}
        art={toArtOpts(artRows)}
        fixed={{ language: lang.entity_id }}
      />
    </section>
  );
}
