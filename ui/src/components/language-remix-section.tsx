import { Suspense } from "react";
import {
  listPaletteSystems,
  listArtStyles,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import { canRemixLanguage } from "@/lib/language-detail-stream";
import { LanguageSectionSkeleton } from "@/components/gallery-skeleton";
import { InlineRemix } from "@/components/remix/inline-remix";
import { RemixLaneBlurb } from "@/components/remix/remix-lane-blurb";
import { SectionHeading, Perforation } from "@/components/scrapbook";

/** Throws on list failure — do not catch-to-`[]` under a painted pulse. */
export async function loadLanguageRemixCatalogs() {
  const [palettes, arts] = await Promise.all([
    listPaletteSystems(),
    listArtStyles(),
  ]);
  return { palettes, arts };
}

/**
 * Sync wrapper: page first paint is not blocked. Pending pulse lives here,
 * not on LanguageDetailPage and not on route loading.tsx.
 */
export function LanguageRemixIsland({ lang }: { lang: DesignLanguage }) {
  return (
    <Suspense fallback={<LanguageSectionSkeleton />}>
      <LanguageRemixSection lang={lang} />
    </Suspense>
  );
}

export async function LanguageRemixSection({
  lang,
}: {
  lang: DesignLanguage;
}) {
  let paletteRows;
  let artRows;
  try {
    const catalogs = await loadLanguageRemixCatalogs();
    paletteRows = catalogs.palettes;
    artRows = catalogs.arts;
  } catch {
    // Catch must not collapse the shell — that is pulse-then-gone.
    return <LanguageSectionSkeleton />;
  }
  if (!canRemixLanguage(lang, paletteRows, artRows)) {
    // [] after a pulse: keep the #245 shell. Do not collapse. Do not
    // invent InlineRemix with empty catalogs.
    return <LanguageSectionSkeleton />;
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
