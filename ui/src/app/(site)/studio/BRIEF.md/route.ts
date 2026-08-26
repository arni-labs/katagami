import { NextRequest } from "next/server";
import {
  getDesignLanguageByIdOrSlug,
  getPaletteSystemByIdOrSlug,
  getArtStyleByIdOrSlug,
  getFileUrl,
  parseJson,
} from "@/lib/odata";
import { buildRemixBrief } from "@/lib/remix-brief";
import { COMPOSITIONS } from "@/lib/remix-compositions";
import { canViewNonPublished, hasFullGalleryAccess } from "@/lib/entity-visibility";
import { anonMaySee } from "@/lib/catalog";

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
    // id OR slug on every lane. Featured slugs (komawari, komawari-plates,
    // cathode-ray) must resolve; a miss slug 404s. ui=gust is a published
    // off-shelf language — resolve, then the featured gate 404s (never 500).
    const [lang, pal, art] = await Promise.all([
      getDesignLanguageByIdOrSlug(uiId),
      getPaletteSystemByIdOrSlug(palId),
      getArtStyleByIdOrSlug(artId),
    ]);
    if (!lang || !pal || !art) {
      return new Response("not found\n", { status: 404 });
    }

    // ARN-331: composing a brief from a non-Published entity in any lane is
    // owner-only — the ids are guessable and the brief embeds spec content.
    const allPublished = [lang, pal, art].every(
      (e) => e.status === "Published",
    );
    if (!allPublished && !(await canViewNonPublished())) {
      return new Response("not found\n", { status: 404 });
    }

    // ARN-385: even when every lane is Published, a signed-out visitor may
    // compose a brief only from the anonymous featured portion of the language
    // and art style (the palette stays public). Gate on the RESOLVED entity
    // id — the query string may be a slug, and featuredIds() is id-keyed.
    if (!(await hasFullGalleryAccess())) {
      const [languageOk, artOk] = await Promise.all([
        anonMaySee("language", lang.entity_id),
        anonMaySee("art_style", art.entity_id),
      ]);
      if (!languageOk || !artOk) {
        return new Response("not found\n", { status: 404 });
      }
    }

    const brief = buildRemixBrief({
      language: {
        name: lang.fields.name ?? "Untitled",
        slug: lang.fields.slug,
        tokens: parseJson(lang.fields.tokens),
        designMdUrl: `/language/${lang.entity_id}/DESIGN.md`,
      },
      palette: {
        name: pal.fields.name ?? "Untitled",
        roles: (parseJson<Record<string, string>>(pal.fields.roles) ?? {}) as Record<string, string>,
      },
      artStyle: {
        name: art.fields.name ?? "Untitled",
        medium: art.fields.medium ?? "",
        promptTemplate: art.fields.prompt_template ?? "",
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
