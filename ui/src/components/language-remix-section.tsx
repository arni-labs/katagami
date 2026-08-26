import {
  listPaletteSystems,
  listArtStyles,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { featuredIds } from "@/lib/catalog";
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
  let remixPalOpts = toPaletteOpts(paletteRows);
  let remixArtOpts = toArtOpts(artRows);

  // ARN-385: the InlineRemix palette + art-style pickers embed the full lists.
  // For a signed-out visitor, withhold the non-featured portion of each — filter
  // the DATA before it reaches the client component (the language is this page's
  // own, already visible to reach here).
  if (!(await hasFullGalleryAccess())) {
    const [paletteIds, artIds] = await Promise.all([
      featuredIds("palette"),
      featuredIds("art_style"),
    ]);
    remixPalOpts = remixPalOpts.filter((o) => paletteIds.has(o.id));
    remixArtOpts = remixArtOpts.filter((o) => artIds.has(o.id));
  }

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
