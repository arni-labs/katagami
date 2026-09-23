// Art-style mediums as a person searches for them. The stored field is free
// text written by whoever made the style: the full library holds 30 spellings
// ("watercolor" and "watercolour", "cut paper" and "cut-paper collage",
// "gouache screen-print", "Tenebrist plate"), so an exact filter for
// "watercolor" found 1 of the 3 watercolour styles. Plain .mjs: shared by the
// catalog and node --test.

/** The broad mediums the search tool advertises. */
export const MEDIUM_BUCKETS = ["illustration", "photography", "print", "painting", "3d", "collage", "mixed"];

/** Lowercase, one spelling, one separator: "Watercolour" and "water-color" become "watercolor". */
export function normaliseMedium(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/colour/g, "color")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Order matters: "gouache screen-print" is a print, "cut-paper gouache" is a collage.
const RULES = [
  ["collage", /collage|cut paper|papercut|paper cut/],
  ["3d", /\b3d\b|render|sculpt/],
  ["photography", /photograph(?!ure)|photo\b|long exposure/],
  ["print", /print|letterpress|relief|engrav|etching|gravure|woodcut|linocut|riso|screentone/],
  ["painting", /paint|watercolor|gouache|ink wash|oil|tenebrist|tempera|fresco/],
  ["illustration", /illustrat|drawing|diagram|pen plot|line art|vector|comic|manga/],
];

/** The broad medium a stored value belongs to; anything unrecognised is "mixed". */
export function mediumBucket(value) {
  const v = normaliseMedium(value);
  for (const [bucket, pattern] of RULES) if (pattern.test(v)) return bucket;
  return MEDIUM_BUCKETS.includes(v) ? v : "mixed";
}

/** Does a stored medium answer a search for `wanted`? A broad name matches its bucket; anything else matches by spelling. */
export function mediumMatches(stored, wanted) {
  const w = normaliseMedium(wanted);
  if (!w) return true;
  if (MEDIUM_BUCKETS.includes(w)) return mediumBucket(stored) === w;
  return normaliseMedium(stored).includes(w);
}
