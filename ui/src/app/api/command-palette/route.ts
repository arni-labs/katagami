import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/command-palette-index";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

export const dynamic = "force-dynamic";

/** Search is requested when opened, never on the gallery's render path.
 * The server chooses the tier on every request; callers cannot choose full.
 * Only the derived index is shared internally, keyed by the authorized tier. */
export async function GET() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const items = await buildSearchIndex(tier);
  return NextResponse.json(items, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
