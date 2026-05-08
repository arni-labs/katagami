import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDesignLanguage } from "@/lib/odata";
import {
  designMdToMarkdown,
  katagamiSpecToMarkdown,
  SpecPanel,
} from "@/components/spec-panel";
import { SpecActions } from "@/components/spec-actions";
import { DesignMdShowcase } from "@/components/design-md-showcase";
import { EmbodimentViewer } from "@/components/embodiment-viewer";
import { DesignShowcase } from "@/components/design-showcase";
import { PageHero, Marker } from "@/components/page-hero";
import {
  StickyNote,
  WashiTape,
  SectionHeading,
  Stamp,
  Perforation,
} from "@/components/scrapbook";

const statusColor: Record<string, string> = {
  Draft: "matcha",
  UnderReview: "yuzu",
  Published: "salad",
  Archived: "sakura",
};

type LanguagePageProps = {
  params: Promise<{ id: string }>;
};

function pageTitle(name?: string): string {
  const trimmed = name?.trim();
  return trimmed ? `katagami ✦ ${trimmed}` : "katagami ✦ language";
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

  const f = lang.fields;

  const accent = statusColor[lang.status] ?? "teal";
  const name = f.name || "Untitled";
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
    hasDesignMd: lang.booleans.has_design_md,
    hasValidDesignMd: lang.booleans.has_valid_design_md,
  };
  const katagamiMarkdown = katagamiSpecToMarkdown(specProps);
  const designMd = designMdToMarkdown(specProps);

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
        eyebrowAccent={accent as never}
        eyebrow={
          <>
            <span>design language</span>
            <span className="font-mono text-muted-foreground/70">·</span>
            <span className="font-mono lowercase tracking-wide">
              {f.slug || id.slice(0, 12)}
            </span>
          </>
        }
        title={<Marker color={accent as never}>{name}</Marker>}
        description={
          <>
            A portable design language for agents: download the markdown first,
            then inspect the preview, tokens, and rules as needed.
          </>
        }
        rightSlot={
          <>
            <Stamp color={accent as never}>{lang.status}</Stamp>
          </>
        }
      />

      <SpecActions
        languageId={id}
        katagamiSpec={katagamiMarkdown}
        designMd={designMd}
        slug={f.slug}
        variant="hero"
      />

      <Perforation />

      {/* Spec + Embodiment — side-by-side on lg+, narrower spec */}
      <div className="grid gap-8 sm:gap-10 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionHeading eyebrow="the spec" eyebrowColor="teal">
            <Marker color="teal">specification</Marker>
          </SectionHeading>
          <StickyNote className="p-5">
            <SpecPanel {...specProps} showActions={false} />
          </StickyNote>
        </section>

        <section className="lg:col-span-3 space-y-8">
          <SectionHeading eyebrow="in the wild" eyebrowColor="sakura">
            <Marker color="salad">design embodiment</Marker>
          </SectionHeading>
          {f.embodiment_file_id &&
          (f.embodiment_format ?? "html") !== "tsx" ? (
            <div className="relative">
              <WashiTape
                color="sakura"
                rotate={-4}
                className="-left-4 -top-3"
                width={100}
              />
              <WashiTape
                color="salad"
                rotate={5}
                className="-right-4 -top-3"
                width={80}
              />
              <div className="relative rounded-[2px] border border-border bg-card p-3 pb-10 shadow-[0_4px_16px_rgba(30,35,45,0.08)]">
                <EmbodimentViewer fileId={f.embodiment_file_id} />
                <span className="absolute bottom-3 left-0 right-0 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">
                  preview · {f.slug || id.slice(0, 12)}
                </span>
              </div>
            </div>
          ) : f.tokens ? (
            <StickyNote tint="teal" className="p-6">
              <DesignShowcase tokensRaw={f.tokens} languageName={name} />
            </StickyNote>
          ) : (
            <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
              {f.embodiment_file_id
                ? "tsx preview is not rendered — view the spec for details"
                : "no embodiment or tokens defined yet"}
            </StickyNote>
          )}
        </section>
      </div>

      <Perforation />

      {/* DESIGN.md preview — palette / type / spacing / shape at-a-glance */}
      <section>
        <SectionHeading eyebrow="DESIGN.md" eyebrowColor="sumire">
          <Marker color="sumire">at a glance</Marker>
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
        />
      </section>
    </div>
  );
}
