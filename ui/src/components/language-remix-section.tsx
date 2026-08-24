import {
  listPaletteSystems,
  listArtStyles,
  type DesignLanguage,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import {
  canRemixLanguage,
  resolveRemixCatalogs,
  type RemixCatalogs,
} from "@/lib/language-detail-stream";
import { InlineRemix } from "@/components/remix/inline-remix";
import { RemixLaneBlurb } from "@/components/remix/remix-lane-blurb";
import { SectionHeading, Perforation } from "@/components/scrapbook";

export async function loadLanguageRemixCatalogs(): Promise<RemixCatalogs> {
  return resolveRemixCatalogs(
    () => listPaletteSystems(),
    () => listArtStyles(),
  );
}

/** Catalogs are resolved on the language page before this island mounts. */
export async function LanguageRemixSection({
  lang,
  catalogs,
}: {
  lang: DesignLanguage;
  catalogs?: RemixCatalogs;
}) {
  const { palettes: paletteRows, arts: artRows } =
    catalogs ?? (await loadLanguageRemixCatalogs());
  const remixLangOpts = toLanguageOpts([lang]);
  const remixPalOpts = toPaletteOpts(paletteRows);
  const remixArtOpts = toArtOpts(artRows);
  if (!canRemixLanguage(lang, paletteRows, artRows)) return null;

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
