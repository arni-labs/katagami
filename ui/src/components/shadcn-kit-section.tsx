import {
  shadcnThemeJson,
  type SpecPanelProps,
} from "@/components/spec-panel";
import { shadcnDesignMdMarkdown } from "@/lib/shadcn-export";
import { ShadcnPreview } from "@/components/shadcn-preview";
import { readTemperFileText } from "@/lib/temper-files";

/**
 * The shadcn implementation kit, rendered as a streamed (Suspense) island so its
 * 3 stored-file reads + markdown generation no longer block the page's TTFB. The
 * hero, spec and embodiment paint immediately; this fills in a beat later.
 */
export async function ShadcnKitSection({
  languageId,
  name,
  designMd,
  fields,
  booleans,
  specProps,
}: {
  languageId: string;
  name: string;
  designMd: string;
  fields: Record<string, string | undefined>;
  booleans: Record<string, boolean>;
  specProps: SpecPanelProps;
}) {
  const [storedShadcnTheme, storedShadcnComponentSpec, storedShadcnPreviewShots] =
    await Promise.all([
      readTemperFileText(fields.shadcn_export_file_id),
      readTemperFileText(fields.shadcn_component_spec_file_id),
      readTemperFileText(fields.shadcn_preview_shots_file_id),
    ]);
  const shadcnTheme = storedShadcnTheme ?? shadcnThemeJson(specProps);
  const shadcnThemeStatus = storedShadcnTheme
    ? booleans.shadcn_export_verified
      ? "validated"
      : "stored-unverified"
    : "generated-preview";
  const shadcnComponentStatus = storedShadcnComponentSpec
    ? booleans.shadcn_component_spec_verified
      ? "validated"
      : "stored-unverified"
    : "generated-preview";
  const shadcnPreviewShotsStatus = storedShadcnPreviewShots
    ? booleans.shadcn_preview_shots_verified
      ? "validated"
      : "stored-unverified"
    : "generated-preview";
  const shadcnDesignMd = shadcnDesignMdMarkdown({
    languageId,
    name,
    slug: fields.slug,
    tokens: fields.tokens,
    philosophy: fields.philosophy,
    rules: fields.rules,
    layout: fields.layout_principles,
    guidance: fields.guidance,
    designMd,
    themeJson: shadcnTheme,
    componentSpec: storedShadcnComponentSpec,
    previewShotsJson: storedShadcnPreviewShots,
    themeStatus: shadcnThemeStatus,
    componentSpecStatus: shadcnComponentStatus,
    previewShotsStatus: shadcnPreviewShotsStatus,
  });

  return (
    <ShadcnPreview
      languageId={languageId}
      languageName={name}
      slug={fields.slug}
      tokensRaw={fields.tokens}
      philosophyRaw={fields.philosophy}
      rulesRaw={fields.rules}
      layoutRaw={fields.layout_principles}
      guidanceRaw={fields.guidance}
      storedThemeJson={storedShadcnTheme}
      storedComponentSpec={storedShadcnComponentSpec}
      storedPreviewShots={storedShadcnPreviewShots}
      shadcnDesignMd={shadcnDesignMd}
      themeStatus={shadcnThemeStatus}
      componentSpecStatus={shadcnComponentStatus}
      previewShotsStatus={shadcnPreviewShotsStatus}
      compact
    />
  );
}
