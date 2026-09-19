import { NextResponse } from "next/server";
import { askLibrary } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { JevUnavailableError } from "@/lib/jev.mjs";
import { trackServerEvent } from "@/lib/server-telemetry";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/ask — describe a product in a sentence; get the design languages and
 * art styles that fit it, by judgment rather than keywords (see askLibrary in
 * lib/catalog.ts). Anonymous callers are matched against the visitor shelf,
 * signed-in callers against the full library — the same gate as /api/search.
 *
 *   ?q=<sentence>                 required, 8..400 characters
 *   ?kind=language|art_style      optional — omit for both
 *   ?k=<1..20>                    optional — how many results (default 8)
 */

// The same sentence asked again within ten minutes is answered from memory:
// an answer costs two model calls, and a refresh should not pay twice.
const recent = new Map<string, { at: number; body: unknown }>();
const RECENT_MS = 10 * 60_000;
const RECENT_MAX = 500;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 8) {
    return NextResponse.json(
      { error: "missing 'q' — describe the product in a sentence (at least 8 characters)" },
      { status: 400 },
    );
  }
  const kindParam = url.searchParams.get("kind");
  if (kindParam && kindParam !== "language" && kindParam !== "art_style") {
    return NextResponse.json(
      { error: `unknown kind '${kindParam}' — use language or art_style, or omit for both` },
      { status: 400 },
    );
  }
  const kind = kindParam === "language" || kindParam === "art_style" ? kindParam : undefined;
  const kRaw = Number.parseInt(url.searchParams.get("k") ?? "", 10);
  const limit = Number.isFinite(kRaw) ? kRaw : undefined;

  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const key = JSON.stringify([tier, kind ?? "", limit ?? "", query.toLowerCase()]);
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < RECENT_MS) {
    return NextResponse.json(hit.body, { headers: { "Cache-Control": "no-store" } });
  }

  const started = Date.now();
  try {
    const body = await askLibrary(tier, { query, kind, limit });
    if (recent.size >= RECENT_MAX) recent.delete(recent.keys().next().value as string);
    recent.set(key, { at: Date.now(), body });
    trackServerEvent("ask_library", { tier, kind: kind ?? "all", results: body.results.length, duration_ms: Date.now() - started });
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    trackServerEvent("ask_library_failed", { tier, reason: err instanceof JevUnavailableError ? "jev" : "other" }, "error");
    if (err instanceof JevUnavailableError) {
      return NextResponse.json(
        { error: "asking is temporarily unavailable — try again shortly" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw err;
  }
}
