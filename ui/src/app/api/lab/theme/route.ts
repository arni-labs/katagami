import { NextResponse } from "next/server";
import { getDesign } from "@/lib/catalog";
import { themeFromTokens } from "@/lib/genui/theme";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

export const dynamic = "force-dynamic";

/**
 * GET /api/lab/theme?ids=<id or slug>[,<id or slug>...]
 *
 * Lab only, no model call. Each language's stored tokens read into the theme a
 * generated screen renders with (lib/genui/theme.ts). The same tier gate as
 * every other read: anonymous callers get visitor-shelf languages only; an id
 * they may not see is left out of the answer, not an error.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
  if (ids.length === 0) return NextResponse.json({ error: "missing 'ids'" }, { status: 400 });
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const themes = (
    await Promise.all(
      ids.map(async (id) => {
        const d = await getDesign("language", id, tier);
        return d ? { ...themeFromTokens(d.id, d.name, d.tokens), url: d.url, thumbnail_url: d.thumbnail_url } : null;
      }),
    )
  ).filter((t) => t !== null);
  return NextResponse.json({ tier, themes }, { headers: { "Cache-Control": "no-store" } });
}
