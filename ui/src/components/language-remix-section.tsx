import {
  listPaletteSystems,
  listArtStyles,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import { InlineRemix } from "@/components/remix/inline-remix";
import { RemixLaneBlurb } from "@/components/remix/remix-lane-blurb";
import { SectionHeading, Perforation } from "@/components/scrapbook";

/** Remix catalogs are huge. They must not block the language page first paint. */
export async function LanguageRemixSection({
  lang,
}: {
  lang: DesignLanguage;
}) {
  const [paletteRows, artRows] = await Promise.all([
    listPaletteSystems().catch(() => []),
    listArtStyles().catch(() => []),
  ]);
  const remixLangOpts = toLanguageOpts([lang]);
  const remixPalOpts = toPaletteOpts(paletteRows);
  const remixArtOpts = toArtOpts(artRows);
  const canRemix =
    remixLangOpts[0]?.landingUrl &&
    remixPalOpts.length > 0 &&
    remixArtOpts.length > 0;
  if (!canRemix) return null;

  return (
    <section>
      <Perforation className="mb-8" />
      <SectionHeading eyebrow="remix lane" eyebrowColor="graphite">
        try a remix
      </SectionHeading>
      <RemixLaneBlurb name={lang.fields.name || "Untitled"} />
      <InlineRemix
        languages={remixLangOpts}
        palettes={remixPalOpts}
        art={remixArtOpts}
        fixed={{ language: lang.entity_id }}
      />
    </section>
  );
}
