import { NextResponse } from "next/server";
import { checkAgainstLanguage } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { JevUnavailableError } from "@/lib/jev.mjs";
import { trackServerEvent } from "@/lib/server-telemetry";
import { callerOf, mayStart, TOO_MANY } from "@/lib/spend-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/check — { language: <id or slug>, page: <HTML source, CSS included> }
 * returns the scorecard of that page against that design language (see
 * checkAgainstLanguage in lib/catalog.ts; the MCP tool check_against_language is
 * the same call). Anonymous callers may check against visitor-shelf languages.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { language?: unknown; page?: unknown } | null;
  const language = typeof body?.language === "string" ? body.language.trim() : "";
  const page = typeof body?.page === "string" ? body.page : "";
  if (!language || page.trim().length < 40 || page.length > 200_000) {
    return NextResponse.json(
      { error: "send { language: <id or slug>, page: <the page's HTML source, 40 to 200000 characters> }" },
      { status: 400 },
    );
  }
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  if (!mayStart("check", callerOf(request), tier)) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429, headers: { "Retry-After": "60" } });
  }
  try {
    const card = await checkAgainstLanguage(tier, language, page);
    if (!card) {
      return NextResponse.json(
        { error: tier === "sample" ? "no such language on the visitor shelf — sign in for the full library" : "no such language" },
        { status: 404 },
      );
    }
    trackServerEvent("check_against_language", { tier, ...card.summary });
    return NextResponse.json(card, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const jev = err instanceof JevUnavailableError;
    trackServerEvent("check_against_language_failed", { tier, reason: jev ? "jev" : "other" }, "error");
    return NextResponse.json(
      { error: jev ? "checking is temporarily unavailable — try again shortly" : "checking failed on our side — it has been logged" },
      { status: jev ? 503 : 500 },
    );
  }
}
