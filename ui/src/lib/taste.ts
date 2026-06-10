/**
 * Taste engine — relevance feedback over the catalog's visual space.
 *
 * Every language is reduced to a numeric feature vector computed from its
 * OWN design tokens (paper darkness, ink saturation, circular hue, type
 * voice) plus its tag set. A session's likes and dislikes form a Rocchio
 * profile: a moving query point in that space. Candidates are scored by
 *
 *   score = α·sim(candidate, liked-centroid)
 *         − β·sim(candidate, disliked-centroid)
 *         + τ·tag-affinity
 *         − λ·redundancy(candidate, recently dealt)   ← MMR
 *         + ε·jitter                                   ← exploration
 *
 * The redundancy term is what separates "more like this" from "the same
 * thing again": near-clones of what was just shown (same family, ~equal
 * vectors) lose to fresh sheets from the same neighborhood.
 *
 * Pure functions, no state, no storage — callers own the session.
 */

export interface TasteInput {
  id: string;
  /** Edition family — editions of one house must not be dealt back to back. */
  family: string;
  tags: string[];
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  headingFont?: string;
}

export interface TasteFeatures {
  id: string;
  family: string;
  vec: number[];
  tags: Set<string>;
}

export interface TasteProfile {
  liked: TasteFeatures[];
  disliked: TasteFeatures[];
  /** tag → accumulated weight (likes add, dislikes subtract) */
  tagWeights: Map<string, number>;
}

export function emptyProfile(): TasteProfile {
  return { liked: [], disliked: [], tagWeights: new Map() };
}

// ── feature extraction ──

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex?: string): Hsl | null {
  if (!hex || !/^#[0-9a-f]{3,8}$/i.test(hex)) return null;
  const m = hex.replace("#", "").slice(0, 6);
  const v =
    m.length === 3
      ? m.split("").map((c) => parseInt(c + c, 16) / 255)
      : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

const SERIF_HINTS = [
  "serif",
  "playfair",
  "lora",
  "spectral",
  "marcellus",
  "georgia",
  "garamond",
  "baskerville",
  "mincho",
  "shippori",
  "crimson",
  "literata",
];
const MONO_HINTS = ["mono", "courier", "consolas"];
const DISPLAY_HINTS = [
  "black",
  "grotesque",
  "orbitron",
  "baloo",
  "bricolage",
  "exo",
  "bungee",
  "righteous",
  "archivo black",
];

function fontVoice(font?: string): { serif: number; mono: number; display: number } {
  const f = (font ?? "").toLowerCase();
  const has = (hints: string[]) => hints.some((h) => f.includes(h));
  const serif = has(SERIF_HINTS) && !f.includes("sans") ? 1 : 0;
  return {
    serif,
    mono: has(MONO_HINTS) ? 1 : 0,
    display: has(DISPLAY_HINTS) ? 1 : 0,
  };
}

/** Encode hue circularly so 350° and 10° read as neighbors, scaled by
 *  saturation so the hue of a near-grey barely matters. */
function huePair(c: Hsl | null): [number, number] {
  if (!c) return [0.5, 0.5];
  const rad = (c.h * Math.PI) / 180;
  const strength = Math.min(1, c.s * 1.4);
  return [
    0.5 + (Math.sin(rad) * strength) / 2,
    0.5 + (Math.cos(rad) * strength) / 2,
  ];
}

export function featuresFor(input: TasteInput): TasteFeatures {
  const bg = hexToHsl(input.colors.background);
  const text = hexToHsl(input.colors.text);
  const prim = hexToHsl(input.colors.primary ?? input.colors.accent);
  const acc = hexToHsl(input.colors.accent ?? input.colors.secondary);
  const voice = fontVoice(input.headingFont);

  const bgL = bg?.l ?? 0.95;
  const contrast = bg && text ? Math.min(1, Math.abs(bg.l - text.l) * 1.3) : 0.7;
  const [pSin, pCos] = huePair(prim);
  const [aSin, aCos] = huePair(acc);

  const vec = [
    bgL,
    contrast,
    prim?.s ?? 0.3,
    prim?.l ?? 0.5,
    pSin,
    pCos,
    (acc?.s ?? 0.3) * 0.7, // accent matters less than primary
    aSin * 0.7,
    aCos * 0.7,
    voice.serif,
    voice.mono,
    voice.display,
  ];

  return {
    id: input.id,
    family: input.family,
    vec,
    tags: new Set(input.tags.filter((t) => t !== "specimen")),
  };
}

// ── similarity ──

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

function centroid(items: TasteFeatures[]): number[] | null {
  if (items.length === 0) return null;
  const out = new Array<number>(items[0].vec.length).fill(0);
  for (const item of items) {
    for (let i = 0; i < out.length; i++) out[i] += item.vec[i];
  }
  return out.map((v) => v / items.length);
}

function tagAffinity(candidate: TasteFeatures, profile: TasteProfile): number {
  if (candidate.tags.size === 0 || profile.tagWeights.size === 0) return 0;
  let sum = 0;
  for (const tag of candidate.tags) sum += profile.tagWeights.get(tag) ?? 0;
  // normalize so tag-rich entries don't win on volume
  return sum / (2 + candidate.tags.size);
}

// ── profile updates ──

export function withLike(profile: TasteProfile, f: TasteFeatures): TasteProfile {
  const tagWeights = new Map(profile.tagWeights);
  for (const tag of f.tags) tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + 1);
  return { liked: [...profile.liked, f], disliked: profile.disliked, tagWeights };
}

export function withDislike(profile: TasteProfile, f: TasteFeatures): TasteProfile {
  const tagWeights = new Map(profile.tagWeights);
  for (const tag of f.tags) tagWeights.set(tag, (tagWeights.get(tag) ?? 0) - 0.5);
  return { liked: profile.liked, disliked: [...profile.disliked, f], tagWeights };
}

// ── scoring ──

const ALPHA = 1.7; // pull toward likes
const BETA = 0.8; // push from dislikes
const TAU = 0.9; // tag affinity
const LAMBDA = 1.5; // redundancy penalty (MMR)
const FAMILY_PENALTY = 0.55; // same edition family as something recent

export function scoreCandidate(
  candidate: TasteFeatures,
  profile: TasteProfile,
  recent: TasteFeatures[],
  jitter: number,
): number {
  let score = 0;

  const likedC = centroid(profile.liked);
  if (likedC) score += ALPHA * cosine(candidate.vec, likedC);
  const dislikedC = centroid(profile.disliked);
  if (dislikedC) score -= BETA * cosine(candidate.vec, dislikedC);
  score += TAU * tagAffinity(candidate, profile);

  // MMR: how redundant is this against what was just on the table?
  let redundancy = 0;
  for (const r of recent) {
    let sim = cosine(candidate.vec, r.vec);
    if (candidate.family === r.family) sim += FAMILY_PENALTY;
    if (sim > redundancy) redundancy = sim;
  }
  score -= LAMBDA * redundancy;

  // explore more while the profile is cold
  const cold = profile.liked.length + profile.disliked.length === 0;
  score += jitter * (cold ? 0.6 : 0.15);

  return score;
}

// ── explainability ──

/** Why was this sheet dealt? Short human phrases comparing the candidate
 *  to the liked profile — shown in the deck so the model stays legible. */
export function explainPick(
  candidate: TasteFeatures,
  profile: TasteProfile,
): string[] {
  const reasons: string[] = [];
  const likedC = centroid(profile.liked);
  if (!likedC) return reasons;

  // shared tags, strongest first
  const shared = Array.from(candidate.tags)
    .map((tag) => ({ tag, w: profile.tagWeights.get(tag) ?? 0 }))
    .filter(({ w }) => w > 0)
    .sort((a, b) => b.w - a.w)
    .slice(0, 2)
    .map(({ tag }) => tag);
  reasons.push(...shared);

  const [bgL, , primS, , , , , , , serif, mono] = candidate.vec;
  const [likedBgL, , likedPrimS, , , , , , , likedSerif, likedMono] = likedC;

  if (bgL < 0.4 && likedBgL < 0.5) reasons.push("dark stock");
  else if (bgL > 0.85 && likedBgL > 0.75) reasons.push("light paper");
  if (primS > 0.6 && likedPrimS > 0.5) reasons.push("loud ink");
  else if (primS < 0.25 && likedPrimS < 0.35) reasons.push("quiet ink");
  if (serif === 1 && likedSerif > 0.5) reasons.push("serif voice");
  if (mono === 1 && likedMono > 0.5) reasons.push("mono voice");

  return reasons.slice(0, 3);
}
