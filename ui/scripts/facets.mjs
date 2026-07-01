// Canonical facet derivations for the design-language gallery — the SINGLE
// source of truth, consumed by the backfill (Node) and, ported identically, by
// the curation finalizer (Rust). Pure + deterministic so both produce the same
// stored scalars. The kernel can only $filter flat stored scalars (and only
// case-sensitively), so these are computed once at publish and stored on the row
// (search_blob / hue_bucket / family_id), then filtered server-side.
//
// Keep this in lockstep with the Rust port — the shared test vectors in
// facets.test.mjs are the contract both must satisfy.

/**
 * HSL hue bucket of a language's primary token color.
 * NORMALIZED (ARN-126): only 3- or 6-digit hex are treated as real colors;
 * anything else (malformed, alpha, missing, grayscale, low-saturation) → "neutral".
 * This deliberately drops the pre-refactor 4/5/7/8-digit NaN→"pink" quirk —
 * real tokens are 6-digit, so the quirk only ever mislabelled bad data.
 * @returns one of neutral|red|orange|yellow|green|teal|blue|violet|pink
 */
export function hueBucket(tokens) {
  const t = typeof tokens === "string" ? safeJson(tokens) : tokens;
  const hex = t?.colors?.primary ?? t?.colors?.accent;
  if (typeof hex !== "string") return "neutral";
  const m = hex.replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(m) || (m.length !== 3 && m.length !== 6)) return "neutral";
  const v =
    m.length === 3
      ? m.split("").map((c) => parseInt(c + c, 16) / 255)
      : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return "neutral";
  const l = (max + min) / 2;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (s < 0.14) return "neutral";
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  if (h >= 345 || h < 15) return "red";
  if (h < 45) return "orange";
  if (h < 75) return "yellow";
  if (h < 160) return "green";
  if (h < 200) return "teal";
  if (h < 260) return "blue";
  if (h < 300) return "violet";
  return "pink";
}

/**
 * Root taxonomy family id: the first of a language's taxonomy_ids that exists in
 * the tree (its primary leaf), walked up parentId to its highest present
 * ancestor. taxIndex: Map<id, { parentId }>. Returns "" for orphans / no taxonomy.
 * The walk order must match the stored taxonomy_ids order (pipeline + backfill
 * read the same canonical row), so first-known-leaf is deterministic.
 */
export function familyId(taxonomyIds, taxIndex) {
  const ids = Array.isArray(taxonomyIds) ? taxonomyIds : safeJson(taxonomyIds);
  if (!Array.isArray(ids)) return "";
  const leaf = ids.find((id) => typeof id === "string" && taxIndex.has(id));
  if (!leaf) return "";
  let cur = leaf;
  for (let guard = 0; guard < 64; guard++) {
    const parent = taxIndex.get(cur)?.parentId;
    if (!parent || !taxIndex.has(parent)) break;
    cur = parent;
  }
  return cur;
}

/**
 * Lowercased search text: name + tags + philosophy summary, collapsed. Powers
 * case-insensitive contains() — the kernel has no tolower/$search/matchesPattern.
 */
export function searchBlob(name, tags, philosophy) {
  const tagArr = Array.isArray(tags) ? tags : safeJson(tags);
  const phil = typeof philosophy === "string" ? safeJson(philosophy) : philosophy;
  const summary = phil && typeof phil === "object" ? phil.summary ?? "" : "";
  return [
    String(name ?? ""),
    ...(Array.isArray(tagArr) ? tagArr.map(String) : []),
    String(summary ?? ""),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function safeJson(s) {
  if (typeof s !== "string" || !s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
