import { NextResponse } from "next/server";
import { getDesignLanguage } from "@/lib/odata";
import { designMdToMarkdown } from "@/components/spec-panel";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

export const dynamic = "force-dynamic";

async function readStoredFile(fileId: string): Promise<ArrayBuffer | null> {
  const fetchHeaders: Record<string, string> = { "X-Tenant-Id": TENANT };
  if (API_KEY) fetchHeaders["Authorization"] = `Bearer ${API_KEY}`;

  const res = await fetch(`${API_BASE}/tdata/Files('${fileId}')/$value`, {
    headers: fetchHeaders,
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.arrayBuffer();
}

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
  const filename = f.slug ? `${f.slug}-DESIGN.md` : "DESIGN.md";

  if (f.design_md_file_id) {
    const stored = await readStoredFile(f.design_md_file_id);
    if (stored) {
      return new NextResponse(stored, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "content-disposition": `inline; filename="${filename}"`,
          "cache-control": "public, max-age=60, s-maxage=300",
          "x-katagami-design-md-status": "validated",
        },
      });
    }
  }

  const markdown = designMdToMarkdown({
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

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-katagami-design-md-status": "generated-preview",
    },
  });
}
