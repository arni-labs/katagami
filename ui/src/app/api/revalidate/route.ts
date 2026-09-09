import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isOwner } from "@/lib/owner";
import { ENCYCLOPEDIA_TAG } from "@/lib/encyclopedia-cache";
import { readsTheEncyclopedia } from "@/lib/encyclopedia-paths";

export const dynamic = "force-dynamic";

/**
 * POST /api/revalidate — flush cached page data for one or more paths.
 *
 * Why this exists: OData reads are cached in-process (unstable_cache,
 * ["odata-read-v1"], revalidate 60s) and pages render from that cache. When a
 * curation agent attaches or edits an entity OData-side, the UI has no way to
 * learn about it until the 60s window lapses — a curator can look at a language
 * page and see stale content (e.g. a philosophy that was just filled in still
 * appears missing). This endpoint lets the pipeline explicitly tell the UI to
 * drop the cache for the affected routes right after a write.
 *
 * Auth: an `x-revalidate-token` header matching REVALIDATE_TOKEN, OR an
 * allowlisted owner session (isOwner()). Body: { paths: string[] } where every
 * path starts with "/". Returns JSON listing what was revalidated.
 *
 * The encyclopedia is held in the server process, outside Next's cache,
 * because the read costs seconds and is the same for every reader the owner
 * gate lets through. `revalidatePath` cannot see that copy, so a curator who
 * wrote a cell and called this endpoint would still be served the previous
 * library for up to a minute — the exact stale-content complaint this endpoint
 * exists to answer. Any path that renders cells revalidates the tag the held
 * read watches.
 */

export async function POST(request: Request) {
  const tokenEnv = process.env.REVALIDATE_TOKEN ?? "";
  const headerToken = request.headers.get("x-revalidate-token") ?? "";
  const tokenOk = Boolean(tokenEnv) && headerToken === tokenEnv;
  const authorized = tokenOk || (await isOwner());
  if (!authorized) {
    return NextResponse.json(
      { error: "unauthorized — provide a valid x-revalidate-token or sign in as an owner" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid JSON body — expected { paths: string[] }" },
      { status: 400 },
    );
  }

  const paths = (body as { paths?: unknown })?.paths;
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json(
      { error: "expected a non-empty 'paths' array" },
      { status: 400 },
    );
  }

  const invalid = paths.filter(
    (p): p is unknown => typeof p !== "string" || !p.startsWith("/"),
  );
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "every path must be a string starting with '/'", invalid },
      { status: 400 },
    );
  }

  const revalidated = paths as string[];
  for (const path of revalidated) {
    revalidatePath(path);
  }
  // Revalidating the tag, not calling a function: a route handler and a page
  // render do not share module state, so dropping the held copy from here
  // reached nothing. Measured — same process id on both sides, the drop ran,
  // and the next render was still served the page's own copy.
  const droppedEncyclopedia = revalidated.some(readsTheEncyclopedia);
  if (droppedEncyclopedia) {
    revalidateTag(ENCYCLOPEDIA_TAG, "max");
    // And the path the epoch entry is scoped to. Measured: revalidating the
    // tag alone dropped nothing, and revalidating "/encyclopedia" did — the
    // cached epoch belongs to the render that read it. So a write announced
    // against "/writing" has to say "/encyclopedia" as well, or the library it
    // shares with that page stays held. Both are cheap and idempotent.
    revalidatePath("/encyclopedia");
  }

  return NextResponse.json({ revalidated, count: revalidated.length, droppedEncyclopedia });
}
