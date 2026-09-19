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

export const STYLE_DNA_SET = "dna-v1";

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
const summaryOf = (v) => {
  const p = parse(v, null);
  return p && !Array.isArray(p) && typeof p === "object" ? text(p.summary) : text(v);
};

/** The canonical text Jev reads for one catalog row. kind: "language" | "art_style". */
export function buildStyleDoc(kind, fields) {
  const f = fields ?? {};
  const tags = (parse(f.tags, []) || []).filter((t) => t !== "specimen").join(", ");
  const lines = [];
  if (kind === "language") {
    const colors = parse(f.tokens, {})?.colors ?? {};
    const palette = ["primary", "secondary", "accent", "background", "text"]
      .filter((role) => text(colors[role]))
      .map((role) => `${role} ${colors[role]}`)
      .join(", ");
    const layout = parse(f.layout_principles, null);
    lines.push(
      `design language: ${text(f.name)}`,
      tags && `qualities: ${tags}`,
      summaryOf(f.philosophy),
      summaryOf(f.imagery_direction) && `imagery: ${summaryOf(f.imagery_direction).slice(0, 300)}`,
      layout && `layout: ${JSON.stringify(layout).slice(0, 400)}`,
      palette && `palette: ${palette}`,
    );
  } else {
    const dos = (parse(f.guidance, {})?.do ?? []).slice(0, 3).join(" ").slice(0, 400);
    lines.push(
      `art style: ${text(f.name)}`,
      tags && `qualities: ${tags}`,
      text(f.medium) && `medium: ${text(f.medium)}`,
      text(f.prompt_template) && `recipe: ${text(f.prompt_template).slice(0, 500)}`,
      dos && `do: ${dos}`,
    );
  }
  return lines.filter(Boolean).join("\n");
}

/** Jev fan-out: every descriptive question, asked of a style's document. */
export function styleQuestions() {
  return Object.fromEntries(STYLE_DNA_QUESTIONS.map((q) => [q.id, { type: "noul", instructions: q.style }]));
}
/** Jev fan-out: the same questions turned on a product sentence. */
export function wantQuestions() {
  return Object.fromEntries(STYLE_DNA_QUESTIONS.map((q) => [q.id, { type: "noul", instructions: q.want }]));
}

/** Jev answers -> { id: 0..1 } over exactly this question set; null if any is missing. */
export function dnaFromAnswers(answers) {
  const out = {};
  for (const id of IDS) {
    const n = answers?.[id]?.noul;
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    out[id] = Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
  }
  return out;
}

export const dnaVersion = (model) => `${STYLE_DNA_SET}/${model}`;

/** Stored fields -> DNA, only when it was asked with the current question set. */
export function storedDna(fields) {
  if (!text(fields?.style_dna_version).startsWith(`${STYLE_DNA_SET}/`)) return null;
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
