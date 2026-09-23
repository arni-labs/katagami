import { NextResponse } from "next/server";
import { BRIEF_MAX, planScreen } from "@/lib/genui/plan";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { callerOf, mayStart, TOO_MANY } from "@/lib/spend-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/lab/plan?brief=<what you want on the screen>
 *
 * Lab only. One Jev call chooses a screen plan from the fixed catalogue in
 * lib/genui/catalogue.ts; the answer is the plan, the model, and how long the
 * call took. When Jev cannot be asked the plan is the keyword fallback and
 * `error` says why — never a failure the page has to handle.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const brief = (url.searchParams.get("brief") ?? "").trim();
  if (brief.length < 4) return NextResponse.json({ error: "missing 'brief' — say what the screen is for (at least 4 characters)" }, { status: 400 });
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  if (!mayStart("lab-plan", callerOf(request), tier)) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429, headers: { "Retry-After": "60" } });
  }
  const planned = await planScreen(brief.slice(0, BRIEF_MAX));
  return NextResponse.json(planned, { headers: { "Cache-Control": "no-store" } });
}
