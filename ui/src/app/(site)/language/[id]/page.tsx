import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getDesignLanguage,
  getFileUrl,
  listPaletteSystems,
  listArtStyles,
  parseJson,
} from "@/lib/odata";
import { RelatedLanguages } from "@/components/related-languages";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import { InlineRemix } from "@/components/remix/inline-remix";
import { readTemperFileText } from "@/lib/temper-files";
import {
  designMdToMarkdown,
  katagamiSpecToMarkdown,
  shadcnThemeJson,
  SpecPanel,
} from "@/components/spec-panel";
import { SpecActions } from "@/components/spec-actions";
import { DesignMdShowcase } from "@/components/design-md-showcase";
import { EmbodimentTabs, type EmbodimentTab } from "@/components/embodiment-tabs";
import { DesignShowcase } from "@/components/design-showcase";
import { ShadcnPreview } from "@/components/shadcn-preview";
import { Credits } from "@/components/credits";
import { PageHero } from "@/components/page-hero";
import { shadcnDesignMdMarkdown } from "@/lib/shadcn-export";
import {
  StickyNote,
  SectionHeading,
  Stamp,
  Perforation,
} from "@/components/scrapbook";



type LanguagePageProps = {
  params: Promise<{ id: string }>;
};

function pageTitle(name?: string): string {
  const trimmed = name?.trim();
  return trimmed ? `katagami ✦ ${trimmed}` : "katagami ✦ language";
}

/** The detail accent is simply the design's OWN identity ink — primary,
 *  then accent, then text — shown as a thin underline. Clear logic, one
 *  minimal mark, no big highlighter box. */
function pickTitleInk(colors?: Record<string, string>): string {
  const isHex = (c?: string): c is string =>
    typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c);
  return (
    [colors?.primary, colors?.accent, colors?.text].find(isHex) ?? "var(--sumi)"
  );
}

export async function generateMetadata({
  params,
}: LanguagePageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const lang = await getDesignLanguage(id);
    const name = lang.fields.name || "Untitled";
    return {
      title: pageTitle(name),
      description: `${name} in the Katagami design language library.`,
      openGraph: {
        title: pageTitle(name),
        description: `${name} in the Katagami design language library.`,
        url: `/language/${id}`,
      },
      twitter: {
        title: pageTitle(name),
        description: `${name} in the Katagami design language library.`,
      },
    };
  } catch {
    return {
      title: pageTitle(),
    };
  }
}

export default async function LanguageDetailPage({
  params,
}: LanguagePageProps) {
  const { id } = await params;

  let lang;
  try {
    lang = await getDesignLanguage(id);
  } catch {
    notFound();
  }

  // Lanes for the in-page remix (swap palette + art on this language).
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

  const f = lang.fields;

  const name = f.name || "Untitled";
  // The page chrome stays neutral so the language's own design reads
  // clearly — the one accent we allow is the language's OWN ink. We pick
  // the most COLORFUL ink for a highlight; a monochrome design gets a
  // crisp underline instead of a muddy grey wash.
  const ownColors = parseJson<{ colors?: Record<string, string> }>(f.tokens)
    ?.colors;
  const titleInk = pickTitleInk(ownColors);
  const isPublished = lang.status === "Published";

  // Three embodiments, each a served self-contained HTML file: the element
  // showcase + the bespoke Landing + the bespoke Dashboard. Published languages
  // serve the embodiment from its public asset URL; pre-publish ones from the
  // governed file id. Both resolve to a fetchable URL via getFileUrl.
  const embodimentAssetUrl = (f.embodiment_asset_url || "").trim();
  // Published languages serve the embodiment from a public CDN asset URL in prod.
  // Locally that URL points at the auth-gated /_internal/blobs route (401 to a
  // client-side iframe), so fall back to the governed same-origin file proxy —
  // server-authenticated, exactly like the landing/dashboard below.
  const embodimentUrl =
    isPublished &&
    embodimentAssetUrl &&
    !embodimentAssetUrl.includes("/_internal/blobs")
      ? embodimentAssetUrl
      : f.embodiment_file_id
        ? getFileUrl(f.embodiment_file_id)
        : embodimentAssetUrl;
  const embodimentRenderable =
    Boolean(embodimentUrl) && (f.embodiment_format ?? "html") !== "tsx";
  const landingUrl = f.landing_file_id ? getFileUrl(f.landing_file_id) : "";
  const dashboardUrl = f.dashboard_file_id ? getFileUrl(f.dashboard_file_id) : "";

  const embodimentTabs: EmbodimentTab[] = [];
  if (embodimentRenderable)
    embodimentTabs.push({
      key: "embodiment",
      label: "Embodiment",
      url: embodimentUrl,
      note: "the full element showcase",
    });
  if (landingUrl)
    embodimentTabs.push({
      key: "landing",
      label: "Landing",
      url: landingUrl,
      note: "bespoke marketing landing",
    });
  if (dashboardUrl)
    embodimentTabs.push({
      key: "dashboard",
      label: "Dashboard",
      url: dashboardUrl,
      note: "bespoke app dashboard",
    });
  const specProps = {
    languageId: id,
    name,
    slug: f.slug,
    philosophy: f.philosophy,
    tokens: f.tokens,
    rules: f.rules,
    layout: f.layout_principles,
    guidance: f.guidance,
    imageryDirection: f.imagery_direction,
    generativeCanvas: f.generative_canvas,
    designMdFileId: f.design_md_file_id,
    designMdLintResult: f.design_md_lint_result,
    shadcnExportFileId: f.shadcn_export_file_id,
    shadcnExportFormatVersion: f.shadcn_export_format_version,
    shadcnExportManifest: f.shadcn_export_manifest,
    shadcnComponentSpecFileId: f.shadcn_component_spec_file_id,
    shadcnComponentSpecManifest: f.shadcn_component_spec_manifest,
    shadcnPreviewShotsFileId: f.shadcn_preview_shots_file_id,
    shadcnPreviewShotsManifest: f.shadcn_preview_shots_manifest,
    hasDesignMd: lang.booleans.has_design_md,
    hasValidDesignMd: lang.booleans.has_valid_design_md,
    hasShadcnExport: lang.booleans.has_shadcn_export,
    shadcnExportVerified: lang.booleans.shadcn_export_verified,
    hasShadcnComponentSpec: lang.booleans.has_shadcn_component_spec,
    shadcnComponentSpecVerified: lang.booleans.shadcn_component_spec_verified,
    hasShadcnPreviewShots: lang.booleans.has_shadcn_preview_shots,
    shadcnPreviewShotsVerified: lang.booleans.shadcn_preview_shots_verified,
  };
  const katagamiMarkdown = katagamiSpecToMarkdown(specProps);
  const designMd = designMdToMarkdown(specProps);
  const [
    storedShadcnTheme,
    storedShadcnComponentSpec,
    storedShadcnPreviewShots,
  ] = await Promise.all([
    readTemperFileText(f.shadcn_export_file_id),
    readTemperFileText(f.shadcn_component_spec_file_id),
    readTemperFileText(f.shadcn_preview_shots_file_id),
  ]);
  const shadcnTheme = storedShadcnTheme ?? shadcnThemeJson(specProps);
  const shadcnThemeStatus = storedShadcnTheme
    ? lang.booleans.shadcn_export_verified
      ? "validated"
      : "stored-unverified"
    : "generated-preview";
  const shadcnComponentStatus = storedShadcnComponentSpec
    ? lang.booleans.shadcn_component_spec_verified
      ? "validated"
      : "stored-unverified"
    : "generated-preview";
  const shadcnPreviewShotsStatus = storedShadcnPreviewShots
    ? lang.booleans.shadcn_preview_shots_verified
      ? "validated"
      : "stored-unverified"
    : "generated-preview";
  const shadcnDesignMd = shadcnDesignMdMarkdown({
    languageId: id,
    name,
    slug: f.slug,
    tokens: f.tokens,
    philosophy: f.philosophy,
    rules: f.rules,
    layout: f.layout_principles,
    guidance: f.guidance,
    designMd,
    themeJson: shadcnTheme,
    componentSpec: storedShadcnComponentSpec,
    previewShotsJson: storedShadcnPreviewShots,
    themeStatus: shadcnThemeStatus,
    componentSpecStatus: shadcnComponentStatus,
    previewShotsStatus: shadcnPreviewShotsStatus,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-10 sm:py-10">
      {/* Back link */}
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to gallery
      </Link>

      {/* Hero */}
      <PageHero
        eyebrowAccent="graphite"
        eyebrow={
          <>
            <span>design language</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              {f.slug || id.slice(0, 12)}
            </span>
          </>
        }
        title={
          <span className="relative inline-block">
            {name}
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-0 h-[3px] w-12 rounded-[2px]"
              style={{ background: titleInk }}
            />
          </span>
        }
        description={
          <>
            A portable design language for agents: download the markdown first,
            then inspect the preview, tokens, and rules as needed.
          </>
        }
        rightSlot={
          <>
            <Stamp color="graphite">{lang.status}</Stamp>
          </>
        }
      />

      <SpecActions
        languageId={id}
        katagamiSpec={katagamiMarkdown}
        designMd={designMd}
        shadcnTheme={shadcnTheme}
        shadcnDesignMd={shadcnDesignMd}
        slug={f.slug}
        variant="hero"
      />

      <Perforation />

      {/* Mobile leads with the visual preview; wider screens set spec left, visuals right. */}
      <div className="grid gap-8 sm:gap-10 md:grid-cols-[minmax(0,0.92fr)_minmax(320px,1.08fr)] md:items-start md:gap-x-10">
        <section data-reveal className="order-2 md:order-1 md:col-start-1">
          <SectionHeading eyebrow="the spec" eyebrowColor="graphite">
            specification
          </SectionHeading>
          <StickyNote className="p-4 sm:p-6">
            <SpecPanel {...specProps} showActions={false} />
          </StickyNote>
        </section>

        <div className="contents md:order-2 md:col-start-2 md:flex md:flex-col md:gap-8">
          <section data-reveal className="order-1 space-y-8 md:space-y-6">
            <SectionHeading eyebrow="in the wild" eyebrowColor="graphite">
              embodiments
            </SectionHeading>
            {embodimentTabs.length > 0 ? (
              <EmbodimentTabs
                tabs={embodimentTabs}
                slug={f.slug || id.slice(0, 12)}
              />
            ) : f.tokens ? (
              <StickyNote tint="teal" className="p-6">
                <DesignShowcase tokensRaw={f.tokens} languageName={name} />
              </StickyNote>
            ) : (
              <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
                {f.embodiment_file_id
                  ? isPublished && !embodimentUrl
                    ? "public embodiment is still publishing"
                    : "tsx preview is not rendered — view the spec for details"
                  : "no embodiment or tokens defined yet"}
              </StickyNote>
            )}
          </section>

          {/* DESIGN.md preview — palette / type / spacing / shape at-a-glance */}
          <section data-reveal className="order-3">
            <SectionHeading eyebrow="DESIGN.md" eyebrowColor="graphite">
              at a glance
            </SectionHeading>
            <DesignMdShowcase
              name={name}
              slug={f.slug}
              philosophy={f.philosophy}
              tokens={f.tokens}
              rules={f.rules}
              layout={f.layout_principles}
              guidance={f.guidance}
              imageryDirection={f.imagery_direction}
              generativeCanvas={f.generative_canvas}
              compact
            />
          </section>

          <section data-reveal className="order-4">
            <SectionHeading eyebrow="shadcn/ui" eyebrowColor="graphite">
              implementation kit
            </SectionHeading>
            <StickyNote tint="teal" className="p-4 sm:p-5">
              <ShadcnPreview
                languageId={id}
                languageName={name}
                slug={f.slug}
                tokensRaw={f.tokens}
                philosophyRaw={f.philosophy}
                rulesRaw={f.rules}
                layoutRaw={f.layout_principles}
                guidanceRaw={f.guidance}
                storedThemeJson={storedShadcnTheme}
                storedComponentSpec={storedShadcnComponentSpec}
                storedPreviewShots={storedShadcnPreviewShots}
                shadcnDesignMd={shadcnDesignMd}
                themeStatus={shadcnThemeStatus}
                componentSpecStatus={shadcnComponentStatus}
                previewShotsStatus={shadcnPreviewShotsStatus}
                compact
              />
            </StickyNote>
          </section>
        </div>
      </div>

      <Credits raw={f.credits} />

      {canRemix ? (
        <section>
          <Perforation className="mb-8" />
          <SectionHeading eyebrow="remix lane" eyebrowColor="graphite">
            try a remix
          </SectionHeading>
          <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            Keep <span className="text-foreground">{name}</span> and swap a palette and an art
            style onto it — the landing &amp; dashboard recolor live. The Studio does the same
            with all three lanes free.
          </p>
          <InlineRemix
            languages={remixLangOpts}
            palettes={remixPalOpts}
            art={remixArtOpts}
            fixed={{ language: id }}
            variant="drawer"
          />
        </section>
      ) : null}

      <RelatedLanguages
        currentId={id}
        currentTags={parseJson<string[]>(f.tags) ?? []}
      />
    </div>
  );
}
