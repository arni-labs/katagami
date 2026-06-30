import { NextResponse } from "next/server";
import { designMdToMarkdown } from "@/components/spec-panel";
import { getPublishedDesignLanguage } from "@/lib/odata";
import { readTemperFileText } from "@/lib/temper-files";
import {
  buildShadcnRegistryTheme,
  isAgentAuthoredShadcnComponentSpec,
  isAgentAuthoredShadcnPreviewShots,
  shadcnDesignMdMarkdown,
  shadcnThemeToJson,
} from "@/lib/shadcn-export";

export const dynamic = "force-dynamic";

function agentAuthoredPreviewShots(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    return isAgentAuthoredShadcnPreviewShots(JSON.parse(raw))
      ? raw.trimEnd()
      : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let lang;
  try {
    lang = await getPublishedDesignLanguage(id);
  } catch {
    return new NextResponse("design language not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const f = lang.fields;
  const filename = f.slug
    ? `${f.slug}-DESIGN.with-shadcn.md`
    : "DESIGN.with-shadcn.md";
  const designMd = designMdToMarkdown({
    languageId: id,
    name: f.name,
    slug: f.slug,
    philosophy: f.philosophy,
    tokens: f.tokens,
    rules: f.rules,
    layout: f.layout_principles,
    guidance: f.guidance,
    imageryDirection: f.imagery_direction,
    generativeCanvas: f.generative_canvas,
  });

  const [
    storedShadcnTheme,
    storedShadcnComponentSpecRaw,
    storedShadcnPreviewShotsRaw,
  ] = await Promise.all([
    readTemperFileText(f.shadcn_export_file_id),
    readTemperFileText(f.shadcn_component_spec_file_id),
    readTemperFileText(f.shadcn_preview_shots_file_id),
  ]);
  const storedComponentSpec = isAgentAuthoredShadcnComponentSpec(
    storedShadcnComponentSpecRaw,
  )
    ? storedShadcnComponentSpecRaw
    : null;
  const storedPreviewShots = agentAuthoredPreviewShots(
    storedShadcnPreviewShotsRaw,
  );
  const themeJson =
    storedShadcnTheme ??
    shadcnThemeToJson(
      buildShadcnRegistryTheme({
        languageId: id,
        name: f.name,
        slug: f.slug,
        tokens: f.tokens,
      }),
    );
  const themeStatus =
    storedShadcnTheme && lang.booleans.shadcn_export_verified
      ? "validated"
      : storedShadcnTheme
        ? "stored-unverified"
        : "generated-preview";
  const componentSpecStatus =
    storedComponentSpec && lang.booleans.shadcn_component_spec_verified
      ? "validated"
      : storedComponentSpec
        ? "stored-unverified"
        : "generated-preview";
  const previewShotsStatus =
    storedPreviewShots && lang.booleans.shadcn_preview_shots_verified
      ? "validated"
      : storedPreviewShots
        ? "stored-unverified"
        : "generated-preview";

  const markdown = shadcnDesignMdMarkdown({
    languageId: id,
    name: f.name,
    slug: f.slug,
    tokens: f.tokens,
    philosophy: f.philosophy,
    rules: f.rules,
    layout: f.layout_principles,
    guidance: f.guidance,
    designMd,
    themeJson,
    componentSpec: storedComponentSpec,
    previewShotsJson: storedPreviewShots,
    themeStatus,
    componentSpecStatus,
    previewShotsStatus,
  });
  const allAgentAuthored =
    componentSpecStatus !== "generated-preview" &&
    previewShotsStatus !== "generated-preview";

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-katagami-shadcn-status": allAgentAuthored
        ? "validated-kit"
        : "compatibility-fallback",
    },
  });
}
