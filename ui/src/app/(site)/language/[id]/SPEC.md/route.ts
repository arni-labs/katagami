import { NextResponse } from "next/server";
import { getDesignLanguage } from "@/lib/odata";
import { specToMarkdown } from "@/components/spec-panel";

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
  const markdown = specToMarkdown({
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

  const filename = f.slug ? `${f.slug}-SPEC.md` : "SPEC.md";

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=60, s-maxage=300",
    },
  });
}
