import { NextResponse } from "next/server";
import { getDesign } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

export const dynamic = "force-dynamic";

/** GET /api/explore/recipe?id=<art style> — the copyable recipe the art-style page offers, for the explore canvas's copy button. Through the catalog gate, so a visitor gets only what their shelf holds. */
export async function GET(request: Request) {
  const id = (new URL(request.url).searchParams.get("id") ?? "").slice(0, 80);
  if (!id) return NextResponse.json({ error: "missing 'id'" }, { status: 400 });
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const art = (await getDesign("art_style", id, tier)) as null | { name?: string; medium?: string; prompt_template?: string; negative_prompt?: string };
  if (!art?.prompt_template) return NextResponse.json({ error: "no recipe" }, { status: 404 });
  const text = `${art.name ?? "Art style"} — Katagami art-style recipe (${art.medium || "mixed"})\n\nPROMPT TEMPLATE\n${art.prompt_template}\n\n${art.negative_prompt ? `AVOID\n${art.negative_prompt}\n\n` : ""}Apply the prompt to the subject in your image or generation request.`;
  return NextResponse.json({ text }, { headers: { "Cache-Control": "no-store" } });
}
