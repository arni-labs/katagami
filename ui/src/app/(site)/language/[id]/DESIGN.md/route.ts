import { NextResponse } from "next/server";
import { getPublishedDesignLanguage } from "@/lib/odata";
import { designMdToMarkdown } from "@/components/spec-panel";
import {
  buildShadcnRegistryTheme,
  shadcnUsageMarkdown,
} from "@/lib/shadcn-export";

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

function withCurrentShadcnUsage(
  markdown: string,
  props: {
    languageId: string;
    name?: string;
    slug?: string;
    tokens?: string;
  },
): string {
  const usage = shadcnUsageMarkdown(
    buildShadcnRegistryTheme({
      languageId: props.languageId,
      name: props.name,
      slug: props.slug,
      tokens: props.tokens,
    }),
  ).trimEnd();
  const trimmed = markdown.trimEnd();
  if (
    trimmed.includes("DESIGN.with-shadcn.md") &&
    trimmed.includes("@/components/ui")
  ) {
    return `${trimmed}\n`;
  }

  const section = /\n## shadcn\/ui Usage\n[\s\S]*?(?=\n## |\s*$)/;
  if (section.test(trimmed)) {
    return `${trimmed.replace(section, `\n${usage}`)}\n`;
  }
  return `${trimmed}\n\n${usage}\n`;
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
  const filename = f.slug ? `${f.slug}-DESIGN.md` : "DESIGN.md";
  const isPublished = lang.status === "Published";
  const storedDesignMdStatus =
    lang.booleans?.has_valid_design_md && lang.booleans?.design_md_verified
      ? "validated"
      : "stored-unverified";

  if (f.design_md_file_id) {
    const stored = await readStoredFile(f.design_md_file_id);
    if (stored) {
      const markdown = withCurrentShadcnUsage(new TextDecoder().decode(stored), {
        languageId: id,
        name: f.name,
        slug: f.slug,
        tokens: f.tokens,
      });
      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "content-disposition": `inline; filename="${filename}"`,
          "cache-control": "public, max-age=60, s-maxage=300",
          "x-katagami-design-md-status": storedDesignMdStatus,
        },
      });
    }
  }

  const markdown = withCurrentShadcnUsage(designMdToMarkdown({
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
  }), {
    languageId: id,
    name: f.name,
    slug: f.slug,
    tokens: f.tokens,
  });

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "public, max-age=60, s-maxage=300",
      "x-katagami-design-md-status": isPublished
        ? "missing-public-artifact-generated-preview"
        : "generated-preview",
    },
  });
}
