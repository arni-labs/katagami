import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isOwner } from "@/lib/owner";

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

  return NextResponse.json({ revalidated, count: revalidated.length });
}
