import { NextRequest } from "next/server";
import {
  getDesignLanguage,
  getPaletteSystem,
  getArtStyle,
  getFileUrl,
  parseJson,
} from "@/lib/odata";
import { buildRemixBrief } from "@/lib/remix-brief";
import { COMPOSITIONS } from "@/lib/remix-compositions";

export const dynamic = "force-dynamic";

// Agent door: GET /studio/BRIEF.md?ui=<id>&palette=<id>&art=<id>&composition=<key>
// Returns the same composite brief the studio's "Copy" button produces, so an
// agent can discover lanes via OData, compose a remix, and fetch the brief.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const uiId = sp.get("ui");
  const palId = sp.get("palette");
  const artId = sp.get("art");
  const compKey = sp.get("composition") ?? "compositions.landing";

  if (!uiId || !palId || !artId) {
    return new Response(
      "Missing required query params: ui, palette, art (and optional composition).",
      { status: 400 },
    );
  }

  const composition =
    COMPOSITIONS.find((c) => c.key === compKey) ?? COMPOSITIONS[0];

  try {
    const [lang, pal, art] = await Promise.all([
      getDesignLanguage(uiId),
      getPaletteSystem(palId),
      getArtStyle(artId),
    ]);

    const brief = buildRemixBrief({
      language: {
        name: lang.fields.name ?? "Untitled",
        slug: lang.fields.slug,
        tokens: parseJson(lang.fields.tokens),
        designMdUrl: `/language/${uiId}/DESIGN.md`,
      },
      palette: {
        name: pal.fields.name ?? "Untitled",
        roles: (parseJson<Record<string, string>>(pal.fields.roles) ?? {}) as Record<string, string>,
      },
      artStyle: {
        name: art.fields.name ?? "Untitled",
        medium: art.fields.medium ?? "",
        promptTemplate: art.fields.prompt_template ?? "",
        negativePrompt: art.fields.negative_prompt,
        slotRecipes: (parseJson<Record<string, string>>(art.fields.slot_recipes) ?? {}) as Record<string, string>,
        referenceUrls: (parseJson<string[]>(art.fields.reference_image_file_ids) ?? []).map(getFileUrl),
      },
      composition,
    });

    return new Response(brief, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (e) {
    return new Response(`Failed to build remix brief: ${String(e)}`, {
      status: 500,
    });
  }
}
