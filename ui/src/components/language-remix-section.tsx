import { cache, Suspense } from "react";
import {
  listPaletteSystems,
  listArtStyles,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import {
  canRemixLanguage,
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
 * Sync: page first paint is not blocked. Pending pulse is painted from
 * language fields (landing + dashboard) — it does not wait for
 * canRemixLanguage. The catalog fetch stays behind fallback={null} so
 * [] / throw never enter a pulsing Suspense (that leftover is closed).
 *
 * Settled empty hides the pending pulse. Settled lane replaces it.
 * Those are separate replays from the in-flight pulse.
 */
export function LanguageRemixIsland({ lang }: { lang: DesignLanguage }) {
  if (remixStreamOutcome(lang) === "empty") return null;

  return (
    <div data-remix-island="">
      <style>{`[data-remix-island]:has([data-remix-empty]){display:none}[data-remix-island]:has([data-remix-ready]) [data-remix-pulse]{display:none}`}</style>
      <div data-remix-pulse>
        <LanguageSectionSkeleton />
      </div>
      <Suspense fallback={null}>
        <RemixCatalogGate lang={lang} />
      </Suspense>
    </div>
  );
}

async function RemixCatalogGate({ lang }: { lang: DesignLanguage }) {
  let catalogs: RemixCatalogs;
  try {
    catalogs = await loadLanguageRemixCatalogs();
  } catch {
    return <span data-remix-empty hidden />;
  }
  if (!canRemixLanguage(lang, catalogs.palettes, catalogs.arts)) {
    return <span data-remix-empty hidden />;
  }
  return (
    <div data-remix-ready>
      <LanguageRemixSection lang={lang} catalogs={catalogs} />
    </div>
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
