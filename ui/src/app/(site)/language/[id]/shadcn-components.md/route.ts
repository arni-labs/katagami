import { NextResponse } from "next/server";
import { getDesignLanguage } from "@/lib/odata";
import { readTemperFileBytes } from "@/lib/temper-files";
import {
  isAgentAuthoredShadcnComponentSpec,
  shadcnComponentSpecMarkdown,
} from "@/lib/shadcn-export";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let lang;
  try {
    lang = await getDesignLanguage(id);
  } catch {
    return new NextResponse("design language not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const f = lang.fields;
  const filename = f.slug
    ? `${f.slug}-shadcn-components.md`
    : "shadcn-components.md";
  const storedStatus =
    lang.booleans?.has_shadcn_component_spec &&
    lang.booleans?.shadcn_component_spec_verified
      ? "validated"
      : "stored-unverified";

  if (f.shadcn_component_spec_file_id) {
    const stored = await readTemperFileBytes(f.shadcn_component_spec_file_id);
    if (stored && isAgentAuthoredShadcnComponentSpec(new TextDecoder().decode(stored))) {
      return new NextResponse(stored, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "content-disposition": `inline; filename="${filename}"`,
          "cache-control": "public, max-age=60, s-maxage=300",
          "x-katagami-shadcn-status": storedStatus,
        },
      });
    }
  }

  const markdown = shadcnComponentSpecMarkdown({
    languageId: id,
    name: f.name,
    slug: f.slug,
    philosophy: f.philosophy,
    tokens: f.tokens,
    rules: f.rules,
    layout: f.layout_principles,
    guidance: f.guidance,
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-katagami-shadcn-status": "generated-preview",
    },
  });
}
