// Style DNA — a description of a design language or art style as answers to a
// fixed set of descriptive questions, each a Jev noul in 0..1. Descriptive
// only: no question asks whether something is good.
//
// Where the questions came from: sixty candidates were written after reading a
// sample of the library, asked of all 457 published languages and art styles
// (2026-09-19, jev-1.13.0), and kept by measurement — a question the library
// answered almost unanimously (sd < 0.20, e.g. "is it experimental": 96% yes)
// or that repeated another (|r| > 0.77, e.g. "for children" vs "playful") was
// dropped. Forty-nine remain. Changing a question's `style` text changes what
// stored answers mean, so bump STYLE_DNA_SET when you do.
//
// Plain .mjs: shared by the Next server, the backfill script and node --test.
//
// dna-v2 changes how the answers are got, not what is asked — the forty-nine
// questions are word for word the ones v1 kept, so a v1 and a v2 reading of the
// same style are comparable. Three things changed. Three questions are now
// measured from the stored palette instead of asked, because we hold the
// palette and a model reading a philosophy paragraph was guessing at it. The
// document Jev reads carries the fields v1 left out and no longer cuts
// sentences in half. And an art style's document can carry a description of
// what its reference pictures actually look like, written by a vision pass,
// which is the only way that half of the library was ever going to be indexed
// on how it looks rather than on how it was described.

export const STYLE_DNA_SET = "dna-v2";

export const STYLE_DNA_QUESTIONS = [
  {
    "id": "dark_ground",
    "label": "dark ground",
    "style": "The ground is dark: work sits on black or a deep colour rather than on white or paper.",
    "want": "The right visual design for this product fits this description: The ground is dark: work sits on black or a deep colour rather than on white or paper."
  },
  {
    "id": "paper_ground",
    "label": "paper ground",
    "style": "This style evokes paper: a warm or textured printed-paper ground, grain, or print artefacts.",
    "want": "The right visual design for this product: it evokes paper: a warm or textured printed-paper ground, grain, or print artefacts."
  },
  {
    "id": "print_process",
    "label": "print process",
    "style": "This style imitates a printing process such as risograph, screenprint, letterpress, halftone or photocopy.",
    "want": "The right visual design for this product: it imitates a printing process such as risograph, screenprint, letterpress, halftone or photocopy."
  },
  {
    "id": "hand_made",
    "label": "hand-made",
    "style": "The marks look made by hand: brush, ink, pencil, cut paper, or visible wobble.",
    "want": "The right visual design for this product fits this description: The marks look made by hand: brush, ink, pencil, cut paper, or visible wobble."
  },
  {
    "id": "photographic",
    "label": "photographic",
    "style": "Photography or photoreal imagery is central to it.",
    "want": "The right visual design for this product fits this description: Photography or photoreal imagery is central to it."
  },
  {
    "id": "illustrated",
    "label": "illustrated",
    "style": "Drawn or painted illustration is central to it.",
    "want": "The right visual design for this product fits this description: Drawn or painted illustration is central to it."
  },
  {
    "id": "type_led",
    "label": "type-led",
    "style": "Typography does the work an image usually would: type is the main visual event.",
    "want": "The right visual design for this product fits this description: Typography does the work an image usually would: type is the main visual event."
  },
  {
    "id": "serif_voice",
    "label": "serif voice",
    "style": "Its typographic voice is serif or otherwise literary and bookish.",
    "want": "The right visual design for this product fits this description: Its typographic voice is serif or otherwise literary and bookish."
  },
  {
    "id": "mono_voice",
    "label": "mono voice",
    "style": "Monospace or technical lettering is a signature part of it.",
    "want": "The right visual design for this product fits this description: Monospace or technical lettering is a signature part of it."
  },
  {
    "id": "condensed_loud",
    "label": "poster type",
    "style": "This style uses loud poster-like display type: condensed, heavy or uppercase headlines.",
    "want": "The right visual design for this product: it uses loud poster-like display type: condensed, heavy or uppercase headlines."
  },
  {
    "id": "dense_data",
    "label": "dense data",
    "style": "This style is built for dense information: tables, telemetry, schedules or dashboards.",
    "want": "The right visual design for this product: it is built for dense information: tables, telemetry, schedules or dashboards."
  },
  {
    "id": "instrument",
    "label": "instrument",
    "style": "This style borrows from scientific or measuring instruments: gauges, scales, readouts, calibration marks.",
    "want": "The right visual design for this product: it borrows from scientific or measuring instruments: gauges, scales, readouts, calibration marks."
  },
  {
    "id": "editorial",
    "label": "editorial",
    "style": "This style is editorial: made for long reading, articles or publishing.",
    "want": "The right visual design for this product: it is editorial: made for long reading, articles or publishing."
  },
  {
    "id": "playful",
    "label": "playful",
    "style": "This style is playful, toy-like or childlike.",
    "want": "The right visual design for this product: it is playful, toy-like or childlike."
  },
  {
    "id": "quiet",
    "label": "quiet",
    "style": "This style is quiet and restrained: few elements, a lot of empty space.",
    "want": "The right visual design for this product: it is quiet and restrained: few elements, a lot of empty space."
  },
  {
    "id": "luxury",
    "label": "premium",
    "style": "This style feels premium or luxurious.",
    "want": "The right visual design for this product: it feels premium or luxurious."
  },
  {
    "id": "civic_utility",
    "label": "civic",
    "style": "This style feels public, civic or utilitarian, like signage, timetables or official forms.",
    "want": "The right visual design for this product: it feels public, civic or utilitarian, like signage, timetables or official forms."
  },
  {
    "id": "nostalgic",
    "label": "nostalgic",
    "style": "This style deliberately evokes a past decade or an obsolete technology.",
    "want": "The right visual design for this product: it deliberately evokes a past decade or an obsolete technology."
  },
  {
    "id": "screen_tech",
    "label": "screen glow",
    "style": "This style evokes screens or electronics: CRT glow, scanlines, pixels, terminals, LEDs.",
    "want": "The right visual design for this product: it evokes screens or electronics: CRT glow, scanlines, pixels, terminals, LEDs."
  },
  {
    "id": "glass_light",
    "label": "glass & light",
    "style": "This style uses translucency, glass, glow or light as a material.",
    "want": "The right visual design for this product: it uses translucency, glass, glow or light as a material."
  },
  {
    "id": "single_accent",
    "label": "one accent",
    "style": "Colour is rationed: nearly monochrome with one accent colour.",
    "want": "The right visual design for this product fits this description: Colour is rationed: nearly monochrome with one accent colour."
  },
  {
    "id": "saturated",
    "label": "saturated",
    "style": "Colour is saturated and bold across large areas.",
    "want": "The right visual design for this product fits this description: Colour is saturated and bold across large areas."
  },
  {
    "id": "earthy",
    "label": "earthy",
    "style": "The palette is earthy, mineral or natural-pigment based.",
    "want": "The right visual design for this product fits this description: The palette is earthy, mineral or natural-pigment based."
  },
  {
    "id": "cool_palette",
    "label": "cool palette",
    "style": "The palette is predominantly cool: blues, teals, violets.",
    "want": "The right visual design for this product fits this description: The palette is predominantly cool: blues, teals, violets."
  },
  {
    "id": "geometric",
    "label": "geometric",
    "style": "This style is strictly geometric: grids, straight rules, circles, modular construction.",
    "want": "The right visual design for this product: it is strictly geometric: grids, straight rules, circles, modular construction."
  },
  {
    "id": "organic",
    "label": "organic",
    "style": "Shapes are organic, soft, flowing or irregular.",
    "want": "The right visual design for this product fits this description: Shapes are organic, soft, flowing or irregular."
  },
  {
    "id": "japanese",
    "label": "Japanese",
    "style": "This style draws clearly on Japanese visual culture.",
    "want": "The right visual design for this product: it draws clearly on Japanese visual culture."
  },
  {
    "id": "modernist",
    "label": "modernist",
    "style": "This style descends from modernist or Swiss graphic design.",
    "want": "The right visual design for this product: it descends from modernist or Swiss graphic design."
  },
  {
    "id": "folk_craft",
    "label": "folk craft",
    "style": "This style draws on folk art, craft or a regional tradition.",
    "want": "The right visual design for this product: it draws on folk art, craft or a regional tradition."
  },
  {
    "id": "comic_manga",
    "label": "comic & manga",
    "style": "This style borrows from comics, manga or graphic novels: panels, screentone, ink keylines.",
    "want": "The right visual design for this product: it borrows from comics, manga or graphic novels: panels, screentone, ink keylines."
  },
  {
    "id": "nature",
    "label": "nature",
    "style": "Nature, landscape, water, plants or weather is a central motif.",
    "want": "The right visual design for this product fits this description: Nature, landscape, water, plants or weather is a central motif."
  },
  {
    "id": "archival",
    "label": "archival",
    "style": "This style evokes archives, documents, records, stamps, seals or field notes.",
    "want": "The right visual design for this product: it evokes archives, documents, records, stamps, seals or field notes."
  },
  {
    "id": "dimensional",
    "label": "dimensional",
    "style": "This style has depth: 3D forms, cast shadows, relief or physical materials photographed.",
    "want": "The right visual design for this product: it has depth: 3D forms, cast shadows, relief or physical materials photographed."
  },
  {
    "id": "flat",
    "label": "flat",
    "style": "This style is completely flat: no shadows, no depth, solid shapes.",
    "want": "The right visual design for this product: it is completely flat: no shadows, no depth, solid shapes."
  },
  {
    "id": "textured",
    "label": "textured",
    "style": "Surface texture, grain or noise is essential to it.",
    "want": "The right visual design for this product fits this description: Surface texture, grain or noise is essential to it."
  },
  {
    "id": "high_contrast",
    "label": "high contrast",
    "style": "This style is very high contrast: stark light against dark with little in between.",
    "want": "The right visual design for this product: it is very high contrast: stark light against dark with little in between."
  },
  {
    "id": "soft_tonal",
    "label": "soft & tonal",
    "style": "This style is soft and tonal: washes, gentle transitions, low contrast.",
    "want": "The right visual design for this product: it is soft and tonal: washes, gentle transitions, low contrast."
  },
  {
    "id": "serious",
    "label": "serious",
    "style": "Its tone is serious, grave or forensic.",
    "want": "The right visual design for this product fits this description: Its tone is serious, grave or forensic."
  },
  {
    "id": "friendly",
    "label": "friendly",
    "style": "Its tone is warm, friendly and approachable.",
    "want": "The right visual design for this product fits this description: Its tone is warm, friendly and approachable."
  },
  {
    "id": "narrative",
    "label": "narrative",
    "style": "This style tells stories: characters, scenes, journeys or sequences.",
    "want": "The right visual design for this product: it tells stories: characters, scenes, journeys or sequences."
  },
  {
    "id": "line_based",
    "label": "line-based",
    "style": "Fine lines, hairlines, contours or diagrams carry it.",
    "want": "The right visual design for this product fits this description: Fine lines, hairlines, contours or diagrams carry it."
  },
  {
    "id": "motion_implied",
    "label": "motion",
    "style": "This style implies movement or time: streams, traces, scrolling, recording.",
    "want": "The right visual design for this product: it implies movement or time: streams, traces, scrolling, recording."
  },
  {
    "id": "cultural",
    "label": "culture",
    "style": "This style suits culture: arts, music, museums, festivals, literature.",
    "want": "This product belongs to culture: arts, music, museums, festivals or literature."
  },
  {
    "id": "finance_legal",
    "label": "high-trust",
    "style": "This style suits finance, law, government or other high-trust institutions.",
    "want": "This product belongs to finance, law, government or another high-trust institution."
  },
  {
    "id": "science_health",
    "label": "science",
    "style": "This style suits science, medicine or research.",
    "want": "This product belongs to science, medicine or research."
  },
  {
    "id": "fashion_lifestyle",
    "label": "lifestyle",
    "style": "This style suits fashion, food, travel or lifestyle.",
    "want": "This product belongs to fashion, food, travel or lifestyle."
  },
  {
    "id": "sacred_contemplative",
    "label": "contemplative",
    "style": "This style is contemplative, meditative or ceremonial.",
    "want": "The right visual design for this product: it is contemplative, meditative or ceremonial."
  },
  {
    "id": "rebellious",
    "label": "rebellious",
    "style": "This style is rebellious, punk, DIY or anti-corporate.",
    "want": "The right visual design for this product: it is rebellious, punk, DIY or anti-corporate."
  },
  {
    "id": "ornamented",
    "label": "ornamented",
    "style": "Ornament, pattern or decoration is a core part of it.",
    "want": "The right visual design for this product fits this description: Ornament, pattern or decoration is a core part of it."
  }
];

const IDS = STYLE_DNA_QUESTIONS.map((q) => q.id);

function parse(v, fallback) {
  if (v && typeof v === "object") return v;
  if (typeof v !== "string" || !v.trim()) return fallback;
  try {
    return JSON.parse(v) ?? fallback;
  } catch {
    return fallback;
  }
}
const text = (v) => (typeof v === "string" ? v.trim() : "");
// Catalog fields are authored JSON: a list may arrive as an object, a string or
// nothing. One odd row must not take the whole library's answer down with it.
const list = (v) => {
  const p = parse(v, []);
  return Array.isArray(p) ? p.filter((x) => typeof x === "string") : [];
};
const record = (v) => {
  const p = parse(v, null);
  return p && typeof p === "object" && !Array.isArray(p) ? p : {};
};
// The same field is a sentence on one row and a {do, dont} object on the next.
// v1 read one shape per field and dropped the rest without a trace: 59 of 301
// languages had no imagery line at all, because their imagery_direction had no
// summary key, and 16 of 156 art styles had no guidance, because theirs was
// written as a sentence rather than a list. Flatten whatever is there instead
// of recognising one shape.
const SKIP_KEY = /(^|_)(id|ids|url|urls|file_id|file_ids|breakpoints_map|schema_version|generated_at|generator|model|provider|tool)$/i;
function prose(value, depth = 0) {
  const v = parse(value, typeof value === "string" ? value : null);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") return v.trim().replace(/\s+/g, " ");
  if (Array.isArray(v)) return v.map((x) => prose(x, depth + 1)).filter(Boolean).join("; ");
  if (v && typeof v === "object" && depth <= 2) {
    return Object.entries(v)
      .filter(([k]) => !SKIP_KEY.test(k))
      .map(([k, x]) => {
        const s = prose(x, depth + 1);
        return s && depth === 0 ? `${k.replace(/_/g, " ")}: ${s}` : s;
      })
      .filter(Boolean)
      .join("; ");
  }
  return "";
}
// v1's limits cut 295 of 301 languages off inside a JSON blob mid-layout, to
// save tokens that cost $0.00005 a row. These are wide enough to hold the
// library as it is — the longest language document is 5,525 characters, about
// 1,400 tokens — and they cut on a word boundary when they do have to cut.
const cap = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n) + 1 || n).trim() + "…");

// --- the three answers we hold rather than guess ----------------------------
//
// A design language stores its whole palette, and three of the questions above
// ask about nothing but that palette. v1 asked a model to read them out of a
// philosophy paragraph, and it answered Vane — ground token #F4F3EE, warm paper,
// its own philosophy saying so — dark-grounded at 0.91. These three are computed
// from the tokens and never asked of a design language. An art style has no
// tokens, so it is still asked all forty-nine; see computedDna.
//
// Eleven more are nearly measurable and stay judgments, because the half we can
// measure is not the half the question turns on. Each has its measurement put
// into the document as a plain fact instead — by measuredLine, by the palette
// line, or by naming the typefaces — so the model answers from what is there
// rather than from a philosophy paragraph:
//
//   paper_ground, geometric, organic   surfaces.treatment and bg_pattern are
//                                      free text, 230 distinct values over 272
//                                      rows, and radius 0 belongs to Swiss
//                                      rigour and to brutalism alike
//   serif_voice                        also says "or otherwise literary and
//                                      bookish", which no font stack settles
//   mono_voice                         300 of 301 languages declare a mono
//                                      font; almost none are led by one
//   condensed_loud                     weight and transform are stored, but
//                                      "loud" lives in the face, not the tokens
//   saturated                          says "across large areas", and we hold
//                                      no areas
//   earthy                             hue and chroma are measurable, "mineral
//                                      or natural-pigment" is a character
//   flat, dimensional                  a 3px 3px 0 printed shadow is flat with
//                                      an offset, and no rule settles which
//   high_contrast                      says "with little in between", and the
//                                      library's measured ground-to-text ratio
//                                      is 12–18 almost everywhere, so measuring
//                                      it separates nothing
//
// That leaves thirty-five that are judgments outright: what a style depicts,
// where it comes from, how it feels, what it is for.
export const COMPUTED_TRAIT_IDS = ["dark_ground", "cool_palette", "single_accent"];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
function rgbOf(value) {
  const s = text(value);
  if (HEX.test(s)) {
    const h = s.slice(1);
    const parts = h.length === 3 ? [...h].map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
    return parts.map((p) => parseInt(p, 16));
  }
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
/** Relative luminance, the sRGB one, so "dark" means dark to an eye and not just low in hex. */
function luminance([r, g, b]) {
  const f = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function hsv([r, g, b]) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return { h, s: max === 0 ? 0 : d / max, v: max / 255 };
}
// Semantic roles are error, success, warning and info. The house contract keeps
// them a small part of the palette and never a primary, so counting them would
// make every style look as colourful as every other.
const SEMANTIC_ROLE = /^(error|success|warning|info|danger|positive|negative|caution)$/i;
const CARRIED_ROLE = /^on[_-]/i;
const GROUND_ROLES = ["bg", "background", "ground", "canvas", "paper", "base", "surface", "surface_solid"];
const INK_ROLES = ["text", "ink", "foreground", "fg"];

/**
 * What a design language's palette measures: its ground, its ink, how much of
 * its colour is cool, and how many separate hues it actually spends. null when
 * there is no palette to measure.
 */
function measurePalette(fields) {
  const colors = record(record(fields?.tokens).colors);
  const ground = GROUND_ROLES.map((r) => rgbOf(colors[r])).find(Boolean);
  if (!ground) return null;
  const families = new Set();
  let coolWeight = 0;
  let weight = 0;
  for (const [role, value] of Object.entries(colors)) {
    if (SEMANTIC_ROLE.test(role) || CARRIED_ROLE.test(role)) continue;
    const c = rgbOf(value);
    if (!c) continue;
    const { h, s, v } = hsv(c);
    weight += s * v;
    if (h >= 170 && h <= 310) coolWeight += s * v;
    // A tint of the accent is the accent, so hues are binned wide: a family is a
    // direction round the wheel, not a shade.
    if (s >= 0.22 && v >= 0.15) families.add(Math.round(h / 45) % 8);
  }
  return {
    ground: luminance(ground),
    groundHex: text(GROUND_ROLES.map((r) => colors[r]).find((v) => rgbOf(v))),
    ink: (() => { const c = INK_ROLES.map((r) => rgbOf(colors[r])).find(Boolean); return c ? luminance(c) : null; })(),
    cool: weight > 0 ? coolWeight / weight : 0,
    families: families.size,
  };
}

// Below lo it is a no, above hi a yes, and in between the answer moves rather
// than flipping, so a style that only just misses is not flatly denied.
const ramp = (v, lo, hi) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
const round3 = (n) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
// One chromatic hue is the whole of "one accent"; two is a scheme, not a ration.
const RATIONED = [0.6, 0.92, 0.45, 0.2];

/**
 * The questions this row answers by measurement: { id: 0..1 }, possibly empty.
 *
 * Only a design language. An art style has no palette to read, and the tone its
 * pictures measure is not the same thing as the ground its work sits on — a
 * page of dense hatching measures dark and is drawn on white paper. That
 * measurement is worth stating and not worth deciding on, so it goes into the
 * document as a fact and an art style is still asked all forty-nine.
 */
export function computedDna(kind, fields) {
  const m = kind === "language" ? measurePalette(fields) : null;
  if (!m) return {};
  return {
    dark_ground: round3(1 - ramp(m.ground, 0.08, 0.35)),
    cool_palette: round3(ramp(m.cool, 0.3, 0.75)),
    single_accent: RATIONED[Math.min(m.families, RATIONED.length - 1)],
  };
}

/** What was measured, in words, for the document: a fact stated beats a fact guessed. */
function measuredLine(kind, fields) {
  if (kind === "language") {
    const m = measurePalette(fields);
    if (!m) return "";
    const contrast = m.ink === null ? null : (Math.max(m.ground, m.ink) + 0.05) / (Math.min(m.ground, m.ink) + 0.05);
    return `measured: ${[
      m.ground < 0.15 ? "the ground is dark" : m.ground > 0.6 ? "the ground is light" : "the ground is mid-toned",
      m.groundHex && `ground ${m.groundHex}`,
      contrast !== null && (contrast >= 14 ? "text reads at full contrast against it" : "text sits at moderate contrast against it"),
      m.cool >= 0.7 ? "nearly all its colour is cool" : m.cool <= 0.2 ? "its colour is warm" : "its colour is mixed warm and cool",
      m.families <= 1 ? "it spends one hue" : `it spends ${m.families} separate hues`,
    ].filter(Boolean).join(", ")}.`;
  }
  const seen = record(fields?.visual_description);
  const tone = Number(seen.tone);
  if (!Number.isFinite(tone)) return "";
  const cool = Number(seen.cool_share);
  return `measured off the pictures: ${[
    tone < 0.12 ? "they read dark overall" : tone > 0.5 ? "they read light overall" : "they read mid-toned overall",
    text(seen.tone_hex) && `median tone ${text(seen.tone_hex)}`,
    Number.isFinite(cool) && (cool >= 0.7 ? "nearly all the colour is cool" : cool <= 0.2 ? "the colour is warm" : "the colour is mixed warm and cool"),
  ].filter(Boolean).join(", ")}.`;
}

/** The canonical text Jev reads for one catalog row. kind: "language" | "art_style".
 *  Ordered so the most identifying lines come first, because the ask pool reads
 *  only the head of it. */
export function buildStyleDoc(kind, fields) {
  const f = fields ?? {};
  const tags = list(f.tags).filter((t) => t !== "specimen").join(", ");
  const lines = [];
  if (kind === "language") {
    const colors = record(record(f.tokens).colors);
    const type = record(record(f.tokens).typography);
    const palette = Object.entries(colors)
      .filter(([role, v]) => !SEMANTIC_ROLE.test(role) && rgbOf(v))
      .slice(0, 10)
      .map(([role, v]) => `${role.replace(/_/g, " ")} ${text(v)}`)
      .join(", ");
    // Naming the typefaces is the whole of the fix for "serif voice" and "mono
    // voice": the model knows what Fraunces is, and a hand-kept list of serifs
    // would be wrong the week the library grows.
    const typeLine = [
      text(type.heading_font) && `headings ${text(type.heading_font)}`,
      text(type.body_font) && `body ${text(type.body_font)}`,
      text(type.mono_font) && `mono ${text(type.mono_font)}`,
      text(type.base_size) && `at ${text(type.base_size)}`,
      text(type.heading_weight) && `heading weight ${text(type.heading_weight)}`,
      text(type.heading_transform) && text(type.heading_transform) !== "none" && `headings ${text(type.heading_transform)}`,
    ].filter(Boolean).join(", ");
    lines.push(
      `design language: ${text(f.name)}`,
      tags && `qualities: ${tags}`,
      measuredLine(kind, f),
      cap(prose(f.philosophy), 1100),
      typeLine && `type: ${typeLine}`,
      palette && `palette: ${palette}`,
      prose(f.imagery_direction) && `imagery: ${cap(prose(f.imagery_direction), 700)}`,
      prose(f.rules) && `rules: ${cap(prose(f.rules), 900)}`,
      prose(f.layout_principles) && `layout: ${cap(prose(f.layout_principles), 600)}`,
      prose(record(f.tokens).surfaces) && `surfaces: ${cap(prose(record(f.tokens).surfaces), 400)}`,
      prose(record(f.tokens).borders) && `borders: ${cap(prose(record(f.tokens).borders), 300)}`,
      prose(f.guidance) && `guidance: ${cap(prose(f.guidance), 500)}`,
      prose(record(f.tokens).motion) && `motion: ${cap(prose(record(f.tokens).motion), 300)}`,
    );
  } else {
    const seen = text(record(f.visual_description).looks_like);
    const subjects = list(record(f.reference_manifest).items?.map?.((i) => i?.subject) ?? []).join("; ");
    lines.push(
      `art style: ${text(f.name)}`,
      tags && `qualities: ${tags}`,
      text(f.medium) && `medium: ${text(f.medium)}`,
      // What the pictures look like, not what the recipe claims they will.
      seen && `looks like: ${cap(seen, 1200)}`,
      measuredLine(kind, f),
      text(f.prompt_template) && `recipe: ${cap(text(f.prompt_template), 900)}`,
      text(f.negative_prompt) && `never: ${cap(text(f.negative_prompt), 300)}`,
      prose(f.guidance) && `guidance: ${cap(prose(f.guidance), 800)}`,
      prose(f.slot_recipes) && `used for: ${cap(prose(f.slot_recipes), 500)}`,
      prose(f.credits) && `tradition: ${cap(prose(f.credits), 400)}`,
      subjects && `reference subjects: ${cap(subjects, 300)}`,
      prose(f.engine_hints) && `engines: ${cap(prose(f.engine_hints), 300)}`,
    );
  }
  return lines.filter(Boolean).join("\n");
}

/** Jev fan-out: every descriptive question, asked of a style's document. */
export function styleQuestions() {
  return Object.fromEntries(STYLE_DNA_QUESTIONS.map((q) => [q.id, { type: "noul", instructions: q.style }]));
}
/** Jev fan-out: the questions this row does not already answer by measurement. */
export function askedQuestions(computed) {
  return Object.fromEntries(
    STYLE_DNA_QUESTIONS.filter((q) => computed?.[q.id] === undefined).map((q) => [q.id, { type: "noul", instructions: q.style }]),
  );
}
/** Jev fan-out: the same questions turned on a product sentence. A product
 *  sentence has no palette, so every one of them is asked. */
export function wantQuestions() {
  return Object.fromEntries(STYLE_DNA_QUESTIONS.map((q) => [q.id, { type: "noul", instructions: q.want }]));
}

/** Jev answers, plus whatever was measured instead of asked -> { id: 0..1 } over
 *  exactly this question set; null if a question is neither answered nor measured. */
export function dnaFromAnswers(answers, computed) {
  const out = {};
  for (const id of IDS) {
    if (computed?.[id] !== undefined) {
      out[id] = round3(computed[id]);
      continue;
    }
    const n = answers?.[id]?.noul;
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    out[id] = round3(n);
  }
  return out;
}

// Refining a reading: "quieter, warmer" is a change, not a product. Each trait
// is asked as an ordinal score — less, unchanged, more — so a nudge that says
// nothing about a trait leaves it where it was instead of re-reading it.
const REFINE_LEVELS = ["less of this", "the change says nothing about this", "more of this"];
/** A score below this distance from "unchanged" is Jev hedging, not a request. */
export const REFINE_MOVES_AT = 0.3;
/** How far a whole-hearted "more" or "less" carries a trait along 0..1. */
const REFINE_STEP = 0.5;

/** Jev fan-out: what a change asks for on every trait. */
export function refineQuestions() {
  return Object.fromEntries(
    STYLE_DNA_QUESTIONS.map((q) => [
      q.id,
      { type: "score", instructions: `A designer asked for this change to a visual design. What does it ask for on this trait?\nTrait: ${q.style}`, criteria: REFINE_LEVELS },
    ]),
  );
}

/**
 * A reading moved by a change. Returns { reading, moved } — moved lists only the
 * traits the change spoke to, largest first — or null if any answer is missing.
 */
export function applyRefinement(reading, answers) {
  const next = {};
  const moved = [];
  for (const q of STYLE_DNA_QUESTIONS) {
    const s = answers?.[q.id]?.score;
    if (typeof s !== "number" || !Number.isFinite(s)) return null;
    const ask = Math.min(1, Math.max(-1, s - 1));
    const from = reading[q.id];
    const to = Math.abs(ask) < REFINE_MOVES_AT ? from : Math.round(Math.min(1, Math.max(0, from + ask * REFINE_STEP)) * 1000) / 1000;
    next[q.id] = to;
    if (to !== from) moved.push({ id: q.id, label: q.label, from, to });
  }
  moved.sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from));
  return { reading: next, moved };
}

export const dnaVersion = (model) => `${STYLE_DNA_SET}/${model}`;

// v2 is written one row at a time and v1 is what the library holds until it is.
// Both answer the same forty-nine questions, so a v1 reading still describes a
// style and still matches a product; it is just less well informed. The gallery
// reads either rather than going blank the moment the set moves, and stops
// reading v1 when the line below loses it.
const READABLE_SETS = new Set(["dna-v2", "dna-v1"]);
const readableSet = (version) => {
  const slash = version.indexOf("/");
  return slash > 0 && READABLE_SETS.has(version.slice(0, slash));
};

/** Stored fields -> DNA, only when it was asked with a question set we still read
 *  by this model: answers from another model are another instrument's readings. */
export function storedDna(fields, model) {
  const version = text(fields?.style_dna_version);
  if (!readableSet(version) || version.slice(version.indexOf("/") + 1) !== model) return null;
  const p = parse(fields?.style_dna, null);
  if (!p || typeof p !== "object") return null;
  for (const id of IDS) if (typeof p[id] !== "number") return null;
  return p;
}

/**
 * How well a style's DNA answers what a product wants, in 0..1. A question the
 * product is indifferent to (want near 0.5) carries no weight, so a sentence
 * that only says "dark and serious" is matched on those alone.
 */
export function matchScore(want, dna) {
  let sum = 0;
  let weight = 0;
  for (const id of IDS) {
    const w = Math.abs(want[id] - 0.5) * 2;
    sum += w * (1 - Math.abs(want[id] - dna[id]));
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}

/** Answers at or above this are a trait of the style: shown on its card, filterable. */
export const TRAIT_AT = 0.6;

/** The flat, filterable form stored beside the DNA: " dark_ground quiet ". */
export function traitsField(dna) {
  const ids = IDS.filter((id) => dna[id] >= TRAIT_AT);
  return ids.length > 0 ? ` ${ids.join(" ")} ` : "";
}

/** Mean DNA of a set of styles: the crowd. */
export function centroid(dnas) {
  const c = Object.fromEntries(IDS.map((id) => [id, 0]));
  for (const d of dnas) for (const id of IDS) c[id] += d[id] / dnas.length;
  return c;
}
/** Distance from the crowd, 0..1: how unlike the average style this one is. */
export function oddness(dna, crowd) {
  return IDS.reduce((s, id) => s + Math.abs(dna[id] - crowd[id]), 0) / IDS.length;
}

/** The few traits a style answers most strongly, for a card: [{id,label,value}]. */
export function topTraits(dna, n = 5) {
  return STYLE_DNA_QUESTIONS.map((q) => ({ id: q.id, label: q.label, value: dna[q.id] }))
    .filter((t) => t.value >= TRAIT_AT)
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

/** The labels to print on a gallery card, from stored fields of any model's
 *  answers to this question set: a card describes, it does not compare. */
export function cardTraits(fields, n = 3) {
  if (!readableSet(text(fields?.style_dna_version))) return [];
  const dna = parse(fields?.style_dna, null);
  if (!dna || typeof dna !== "object" || Array.isArray(dna)) return [];
  return STYLE_DNA_QUESTIONS.filter((q) => typeof dna[q.id] === "number" && dna[q.id] >= TRAIT_AT)
    .sort((a, b) => dna[b.id] - dna[a.id])
    .slice(0, n)
    .map((q) => q.label);
}
