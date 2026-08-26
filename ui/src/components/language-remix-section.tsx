import { cache, Suspense } from "react";
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
  type RemixCatalogs,
} from "@/lib/language-detail-stream";
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

/** Preview-shaped pulse. Not two h-72 — that leftover collapses after [] / throw. */
export function RemixControlsPulse() {
  return (
    <div
      aria-hidden
      className="aspect-[16/10] w-full animate-pulse bg-muted"
    />
  );
}

/** Same well as the pulse, static. [] / throw stay dark without collapsing. */
export function RemixControlsDark() {
  return <div aria-hidden className="aspect-[16/10] w-full bg-muted" />;
}

function RemixControlsResolved({
  lang,
  catalogs,
  initialPreviewHtml = "",
}: {
  lang: DesignLanguage;
  catalogs: RemixCatalogs;
  initialPreviewHtml?: string;
}) {
  if (!canRemixLanguage(lang, catalogs.palettes, catalogs.arts)) {
    return <RemixControlsDark />;
  }
  return (
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
  );
}

/**
 * Live Suspense leaf — the same child page.tsx reaches through
 * LanguageDetailRemix({ lang }). Pending is RemixControlsPulse (hold 2).
 * [] / throw resolve to RemixControlsDark here, so they do not keep the
 * pulse fallback (hold 3). Do not await getFileText after empty catalogs.
 */
export async function LanguageRemixControls({ lang }: { lang: DesignLanguage }) {
  const catalogs = await loadLanguageRemixCatalogs();
  if (!canRemixLanguage(lang, catalogs.palettes, catalogs.arts)) {
    return <RemixControlsDark />;
  }
  const landingId = lang.fields.landing_file_id ?? "";
  const initialPreviewHtml = landingId ? await getFileText(landingId) : "";
  return (
    <RemixControlsResolved
      lang={lang}
      catalogs={catalogs}
      initialPreviewHtml={initialPreviewHtml}
    />
  );
}

/**
 * Live slot page.tsx mounts: `<LanguageDetailRemix lang={lang} />`.
 * Sync chrome (remix lane) so hero/spec already in the document while
 * catalogs suspend inside. No catalogs prop — that helper is not the
 * live tree. Inner Suspense pulses; [] / throw do not share a page-level
 * pulse (that flashes then goes dark).
 */
export function LanguageDetailRemix({ lang }: { lang: DesignLanguage }) {
  if (!languageHasRemixComposition(lang)) return null;
  return (
    <section>
      <Perforation className="mb-8" />
      <SectionHeading eyebrow="remix lane" eyebrowColor="graphite">
        try a remix
      </SectionHeading>
      <RemixLaneBlurb name={lang.fields.name || "Untitled"} />
      <Suspense fallback={<RemixControlsPulse />}>
        <LanguageRemixControls lang={lang} />
      </Suspense>
    </section>
  );
}

export function LanguageRemixSection({ lang }: { lang: DesignLanguage }) {
  return <LanguageDetailRemix lang={lang} />;
}
