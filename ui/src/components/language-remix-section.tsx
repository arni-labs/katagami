import { cache, Suspense } from "react";
import {
  listPaletteSystems,
  listArtStyles,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import {
  canRemixLanguage,
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
 * Sync: page first paint is not blocked. The catalog fetch uses a dark
 * fallback so [] / throw never paint two h-72. After catalogs prove a
 * lane, pending UI is LanguageSectionSkeleton.
 */
export function LanguageRemixIsland({ lang }: { lang: DesignLanguage }) {
  return (
    <Suspense fallback={null}>
      <RemixCatalogGate lang={lang} />
    </Suspense>
  );
}

async function RemixCatalogGate({ lang }: { lang: DesignLanguage }) {
  let catalogs: RemixCatalogs;
  try {
    catalogs = await loadLanguageRemixCatalogs();
  } catch {
    return null;
  }
  if (!canRemixLanguage(lang, catalogs.palettes, catalogs.arts)) {
    return null;
  }
  return (
    <Suspense fallback={<LanguageSectionSkeleton />}>
      <LanguageRemixSection lang={lang} catalogs={catalogs} />
    </Suspense>
  );
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
