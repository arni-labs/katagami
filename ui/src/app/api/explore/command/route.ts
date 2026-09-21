import { NextResponse } from "next/server";
import { askJev, noul } from "@/lib/jev.mjs";
import { judgeStyleFor, libraryAtlas } from "@/lib/catalog";
import { STYLE_DNA_QUESTIONS } from "@/lib/style-dna.mjs";
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
 *   arrange  order the wall along a measured trait ("dark to light", "quietest to loudest", "by how 70s it feels")
 *   plot     two traits against each other, as the wall's two axes
 *   narrow   keep only those with a trait ("only the dark ones"), of the answer on screen or of the whole wall
 *   pin      put the best N of the answer (or the open style) on the shortlist
 *   judge    with a style open: would it suit this? a verdict from that style's own description  — needs `open`
 *
 * Names are found in code against what this caller may see (never by the model), so a command cannot name or reveal
 * a style off the caller's shelf. Several actions may come back at once ("only art styles, by family, zoomed out").
 */
const HUES = ["red", "orange", "yellow", "green", "teal", "blue", "violet", "pink", "neutral"] as const;
const SKINS = { stamp: "postage stamps", stencil: "cut paper stencils", swatch: "paint swatches or colour chips", proof: "risograph print proofs" } as const;

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
  arrange: "They want the library put in order along some quality, from less of it to more of it (or the reverse).",
  plot: "They name two different qualities and want them set against each other, as two axes or a chart.",
  narrow: "They want to keep only the styles that have some quality, dropping the rest.",
  pin: "They want to save, keep, pin or shortlist some of what is on screen.",
  judge: "They are asking whether the one style that is open on screen would suit, fit or work for something.",
  reverse: "The first thing they name in the ordering is the one with the most of the quality (for example darkest first, loudest first).",
} as Record<string, string>;
// Which measured trait the words point at: one noul per trait, in the same call.
const TRAITS = STYLE_DNA_QUESTIONS as { id: string; label: string; style: string }[];
const NUMBER: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

type Action = { do: string; [key: string]: unknown };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 400);
  if (q.length < 2) return NextResponse.json({ error: "missing 'q'" }, { status: 400 });
  const hasAnswer = url.searchParams.get("answer") === "1";
  const open = (url.searchParams.get("open") ?? "").slice(0, 80), openKind = url.searchParams.get("kind") === "art_style" ? "art_style" : "language";
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
    const { answers } = await askJev(`Someone is using a visual library of design styles, shown as a wall of cards they can filter, sort, zoom and restyle. ${hasAnswer ? "Results for an earlier question are on screen. " : ""}They type into its command bar: ${q}`, { ...Object.fromEntries(Object.entries(Q).map(([k, says]) => [k, noul(says)])), ...Object.fromEntries(TRAITS.map((t) => [`trait_${t.id}`, noul(`Their words mention or point at this quality of a visual style: ${t.style}`)])) }, { timeoutMs: 7000, retries: 1 });
    scores = Object.fromEntries(Object.keys(answers).map((k) => [k, Number((answers[k] as { noul?: number } | undefined)?.noul ?? 0)]));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const raw = (k: string) => scores[k] ?? 0, sure = 0.62;
  // Operating the screen has to be meant more than asking it something: a described product is never a zoom or a sort.
  const at = (k: string) => (k === "question" || k === "refine" || k === "compare" || k === "like" || k === "judge" || k === "reverse" || k === "narrow" || k === "arrange" || k === "plot" || k === "pin" || k.startsWith("skin_") || k.startsWith("trait_") || raw(k) > raw("question") ? raw(k) : 0);
  const best = (prefix: string) => Object.keys(Q).filter((k) => k.startsWith(prefix)).sort((a, b) => at(b) - at(a))[0];
  // A phrase shaped like an ordering names its quality loosely ("dark to light"); take the best guess then.
  const loose = /\b\w+\s+to\s+\w+\b|\bby how\b|\b(sort|order|arrange)/i.test(q);
  const traits = TRAITS.map((t) => ({ id: t.id, label: t.label, n: raw(`trait_${t.id}`) })).filter((t) => t.n >= (loose ? 0.4 : 0.6)).sort((a, b) => b.n - a.n);
  const actions: Action[] = [];
  if (open && raw("judge") >= 0.6) {
    const verdict = await judgeStyleFor(tier, openKind, open, q).catch(() => null);
    if (verdict) return NextResponse.json({ q, tier, actions: [{ do: "judge", id: open, ...verdict }], named: [], timings_ms: { jev: Date.now() - started } }, { headers: { "Cache-Control": "no-store" } });
  }
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
    // Trait operations: the words name a measured quality, and say what to do with it. With an answer on screen a
    // bare change ("warmer") is a refinement, not an ordering; "only/just the … ones" is always a narrowing.
    const onlyThe = /\b(only|just)\b/i.test(q) && !/\b(art styles?|design languages?|languages)\b/i.test(q);
    // The shape of the phrase is a plainer signal than any score: "X to Y" and "by how …" order, "against" plots.
    const ordering = /\b\w+\s+to\s+\w+\b|\b(sort|sorted|order|ordered|arrange|arranged)\b|\bby how\b/i.test(q), plotting = /\b(against|versus|vs\.?)\b/i.test(q);
    const refining = !ordering && !plotting && hasAnswer && raw("refine") >= sure && raw("refine") >= Math.max(raw("arrange"), raw("plot")) && !onlyThe;
    if (refining) { /* falls through to refine below */ }
    else if (plotting) {
      // Each side of "against" names its own quality: read the two halves separately, one trait from each.
      const halves = q.split(/\b(?:against|versus|vs\.?)\b/i).map((h) => h.trim()).filter(Boolean).slice(0, 2);
      const sides = await Promise.all(halves.map((half) => askJev(`A quality of a visual style, named in a few words: ${half}`, Object.fromEntries(TRAITS.map((t) => [t.id, noul(`The words mean this quality: ${t.style}`)])), { timeoutMs: 6000, retries: 1 }).then((res) => TRAITS.map((t) => ({ id: t.id, label: t.label, n: Number((res.answers[t.id] as { noul?: number } | undefined)?.noul ?? 0) })).sort((a, b) => b.n - a.n)).catch(() => [])));
      const x = sides[0]?.[0], y = sides[1]?.find((t) => t.id !== x?.id);
      if (x && y) actions.push({ do: "plot", x: x.id, y: y.id, labels: [x.label, y.label] });
    }
    else if (traits.length >= 2 && at("plot") >= sure) actions.push({ do: "plot", x: traits[0].id, y: traits[1].id, labels: [traits[0].label, traits[1].label] });
    else if (traits.length >= 1 && (onlyThe || (at("narrow") >= sure && at("narrow") >= at("arrange")))) actions.push({ do: "narrow", trait: traits[0].id, label: traits[0].label });
    else if (traits.length >= 1 && (ordering || at("arrange") >= 0.78)) actions.push({ do: "arrange", trait: traits[0].id, label: traits[0].label, reverse: raw("reverse") >= 0.6 });
    if (at("pin") >= sure) actions.push({ do: "pin", n: NUMBER[(q.toLowerCase().match(/\b(one|two|three|four|five|six)\b/) ?? [])[1] ?? ""] ?? Number.parseInt((q.match(/\b([1-9])\b/) ?? [])[1] ?? "3", 10) });
    // The ones that produce an answer, at most one, and only when the screen was not simply being operated.
    if (named.length >= 2 && at("compare") >= 0.5) actions.push({ do: "compare", ids: named.map((n) => n.id), names: named.map((n) => n.name) });
    else if (named.length >= 1 && at("like") >= 0.5) actions.push({ do: "like", id: named[0].id, name: named[0].name });
    else if (actions.length === 0) actions.push(hasAnswer && at("refine") >= sure && at("refine") > at("question") ? { do: "refine", say: q } : { do: "ask", q });
  }
  return NextResponse.json({ q, tier, actions, named, timings_ms: { jev: Date.now() - started }, ...(error ? { error } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
