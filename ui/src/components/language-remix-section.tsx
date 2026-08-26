import { cache } from "react";
import {
  listPaletteSystems,
  listArtStyles,
  getFileText,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import {
  canRemixLanguage,
  languageHasRemixComposition,
  remixPageFirstPaint,
  type RemixCatalogs,
} from "@/lib/language-detail-stream";
import { LanguageSectionSkeleton } from "@/components/gallery-skeleton";
import { InlineRemix } from "@/components/remix/inline-remix";
import { RemixLaneBlurb } from "@/components/remix/remix-lane-blurb";
import { SectionHeading, Perforation } from "@/components/scrapbook";

export const loadLanguageRemixCatalogs = cache(async (): Promise<RemixCatalogs> => {
  const [palettes, arts] = await Promise.all([
    listPaletteSystems().catch(() => []),
    listArtStyles().catch(() => []),
  ]);
  return { palettes, arts };
});

function RemixLane({
  lang,
  catalogs,
  initialPreviewHtml = "",
}: {
  lang: DesignLanguage;
  catalogs: RemixCatalogs;
  initialPreviewHtml?: string;
}) {
  if (!canRemixLanguage(lang, catalogs.palettes, catalogs.arts)) return null;
  return (
    <section>
      <Perforation className="mb-8" />
      <SectionHeading eyebrow="remix lane" eyebrowColor="graphite">
        try a remix
      </SectionHeading>
      <RemixLaneBlurb name={lang.fields.name || "Untitled"} />
      <InlineRemix
        languages={toLanguageOpts([lang])}
        palettes={toPaletteOpts(catalogs.palettes)}
        art={toArtOpts(catalogs.arts)}
        fixed={{ language: lang.entity_id }}
        initial={{
          palId: lang.fields.default_palette_id,
          artId: lang.fields.default_art_style_id,
        }}
        initialPreviewHtml={initialPreviewHtml}
      />
    </section>
  );
}

/** Sync island for the page-tree tests. Catalogs already in hand. */
export function LanguageRemixIsland({
  lang,
  catalogs,
  initialPreviewHtml = "",
}: {
  lang: DesignLanguage;
  catalogs: RemixCatalogs;
  initialPreviewHtml?: string;
}) {
  return (
    <RemixLane
      lang={lang}
      catalogs={catalogs}
      initialPreviewHtml={initialPreviewHtml}
    />
  );
}

/**
 * Page-tree paints. Tests render this — not a settled island alone.
 * Pending (catalogs omitted) is two h-72. [] / throw is dark (no h-72).
 */
export function LanguageRemixPageTree({
  lang,
  catalogs,
  initialPreviewHtml = "",
}: {
  lang: DesignLanguage;
  catalogs?: RemixCatalogs;
  initialPreviewHtml?: string;
}) {
  const paint = remixPageFirstPaint(lang, catalogs);
  if (paint === "dark") return null;
  if (paint === "pulse") return <LanguageSectionSkeleton />;
  return (
    <LanguageRemixIsland
      lang={lang}
      catalogs={catalogs!}
      initialPreviewHtml={initialPreviewHtml}
    />
  );
}

/**
 * What LanguageDetailPage mounts. Lang only — does not await catalogs
 * on the page. Does not wrap the fetch in the pending pulse (that leftover
 * lets [] / throw ride two h-72, then collapse).
 */
export async function LanguageDetailRemix({ lang }: { lang: DesignLanguage }) {
  if (!languageHasRemixComposition(lang)) return null;
  return <LanguageRemixSection lang={lang} />;
}

/** Remix catalogs are huge. They must not be awaited on LanguageDetailPage. */
export async function LanguageRemixSection({
  lang,
}: {
  lang: DesignLanguage;
}) {
  const catalogs = await loadLanguageRemixCatalogs();
  if (!canRemixLanguage(lang, catalogs.palettes, catalogs.arts)) return null;
  const landingId = lang.fields.landing_file_id ?? "";
  const initialPreviewHtml = landingId ? await getFileText(landingId) : "";
  return (
    <RemixLane
      lang={lang}
      catalogs={catalogs}
      initialPreviewHtml={initialPreviewHtml}
    />
  );
}
