import { NextResponse } from "next/server";
import { askJev, noul } from "@/lib/jev.mjs";
import { libraryAtlas } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { callerOf, mayStart, TOO_MANY } from "@/lib/spend-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/explore/command?q=<what was typed>&answer=1&skin=<current>
 *
 * The explore canvas is operated in words. Whatever is typed is read, in one Jev call, as what the person wants
 * the screen to do, and comes back as a short list of actions the page already knows how to perform: nothing here
 * invents interface, it chooses among the page's own controls and fills in their arguments.
 *
 *   ask      the ordinary question: find styles that fit (the default when nothing else is meant)
 *   refine   change the answer on screen ("warmer", "less corporate")  — only when `answer=1`
 *   compare  put named styles side by side                              — needs two names found in the text
 *   like     start from a named style and gather what is like it        — needs one name
 *   sort     re-sort the sheet by colour / family
 *   colour   gather one hue in the middle
 *   kinds    show only design languages / only art styles / both
 *   zoom     closer / further
 *   skin     change what the cards are made of
 *   reset    clear everything
 *
 * Names are found in code against what this caller may see (never by the model), so a command cannot name or reveal
 * a style off the caller's shelf. Several actions may come back at once ("only art styles, by family, zoomed out").
 */
const HUES = ["red", "orange", "yellow", "green", "teal", "blue", "violet", "pink", "neutral"] as const;
const SKINS = { stamp: "postage stamps", stencil: "cut paper stencils", swatch: "paint swatches or colour chips", proof: "risograph print proofs", slide: "photographic slides", specimen: "museum specimen labels" } as const;

const Q = {
  refine: "They are asking to change or adjust the results already shown (more of something, less of something), not asking a new question.",
  compare: "They want specific named styles put side by side and compared.",
  like: "They name one specific style and want others similar to it.",
  sort_colour: "They want the whole library arranged or sorted by colour.",
  sort_family: "They want the whole library arranged or grouped by family, kind of look, or similarity.",
  only_languages: "They explicitly ask to hide art styles and show only the design languages, as a filter on the library.",
  only_art: "They explicitly ask to hide design languages and show only the art styles, as a filter on the library.",
  both_kinds: "They ask to bring back everything, all kinds, the whole library, after having narrowed it.",
  closer: "They want to zoom in, see things bigger or in more detail.",
  further: "They ask to zoom out, make things smaller, or fit more on the screen at once.",
  reset: "They want to clear, reset or start over.",
  question: "They are describing something they are making, or a quality they want, and are asking the library for styles that fit it.",
  ...Object.fromEntries(HUES.map((h) => [`hue_${h}`, `They want to see styles that are mainly ${h === "neutral" ? "grey, black and white, or neutral" : h} in colour, as a matter of browsing by colour.`])),
  ...Object.fromEntries(Object.entries(SKINS).map(([k, says]) => [`skin_${k}`, `They want the cards on screen to look like ${says}.`])),
} as Record<string, string>;

type Action = { do: string; [key: string]: unknown };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 400);
  if (q.length < 2) return NextResponse.json({ error: "missing 'q'" }, { status: 400 });
  const hasAnswer = url.searchParams.get("answer") === "1";
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  if (!mayStart("explore-command", callerOf(request), tier)) return NextResponse.json({ error: TOO_MANY }, { status: 429, headers: { "Retry-After": "60" } });

  // Names in the text, longest first, among the styles this caller can see.
  const { styles } = await libraryAtlas(tier);
  const lower = ` ${q.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, " ")} `;
  const named: { id: string; name: string }[] = [];
  for (const s of [...styles].sort((a, b) => b.name.length - a.name.length)) {
    const name = ` ${s.name.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, " ").trim()} `;
    if (name.trim().length >= 4 && lower.includes(name) && !named.some((n) => n.name === s.name)) named.push({ id: s.id, name: s.name });
    if (named.length === 4) break;
  }

  const started = Date.now();
  let scores: Record<string, number> = {};
  let error: string | undefined;
  try {
    const { answers } = await askJev(`Someone is using a visual library of design styles, shown as a wall of cards they can filter, sort, zoom and restyle. ${hasAnswer ? "Results for an earlier question are on screen. " : ""}They type into its command bar: ${q}`, Object.fromEntries(Object.entries(Q).map(([k, says]) => [k, noul(says)])), { timeoutMs: 6000, retries: 1 });
    scores = Object.fromEntries(Object.keys(Q).map((k) => [k, Number((answers[k] as { noul?: number } | undefined)?.noul ?? 0)]));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const raw = (k: string) => scores[k] ?? 0, sure = 0.62;
  // Operating the screen has to be meant more than asking it something: a described product is never a zoom or a sort.
  const at = (k: string) => (k === "question" || k === "refine" || k === "compare" || k === "like" || k.startsWith("skin_") || raw(k) > raw("question") ? raw(k) : 0);
  const best = (prefix: string) => Object.keys(Q).filter((k) => k.startsWith(prefix)).sort((a, b) => at(b) - at(a))[0];
  const actions: Action[] = [];
  if (at("reset") >= 0.75) actions.push({ do: "reset" });
  else {
    if (at("only_languages") >= sure && at("only_languages") > at("only_art")) actions.push({ do: "kinds", language: true, art_style: false });
    else if (at("only_art") >= sure) actions.push({ do: "kinds", language: false, art_style: true });
    else if (at("both_kinds") >= sure) actions.push({ do: "kinds", language: true, art_style: true });
    if (at("sort_family") >= 0.75 && at("sort_family") > at("sort_colour")) actions.push({ do: "sort", by: "family" });
    else if (at("sort_colour") >= 0.75) actions.push({ do: "sort", by: "colour" });
    const hue = best("hue_"), skin = best("skin_");
    if (at(hue) >= sure) actions.push({ do: "colour", hue: hue.slice(4) });
    if (at(skin) >= 0.7) actions.push({ do: "skin", skin: skin.slice(5) }); // "cards that look like…" also reads as a look someone is after, so this one is judged on its own
    if (at("further") >= sure && at("further") > at("closer")) actions.push({ do: "zoom", by: -1 });
    else if (at("closer") >= sure) actions.push({ do: "zoom", by: 1 });
    // The ones that produce an answer, at most one, and only when the screen was not simply being operated.
    if (named.length >= 2 && at("compare") >= 0.5) actions.push({ do: "compare", ids: named.map((n) => n.id), names: named.map((n) => n.name) });
    else if (named.length >= 1 && at("like") >= 0.5) actions.push({ do: "like", id: named[0].id, name: named[0].name });
    else if (actions.length === 0) actions.push(hasAnswer && at("refine") >= sure && at("refine") > at("question") ? { do: "refine", say: q } : { do: "ask", q });
  }
  return NextResponse.json({ q, tier, actions, named, timings_ms: { jev: Date.now() - started }, ...(error ? { error } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
