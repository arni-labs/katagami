// Lexical name/slug ranking for /api/search (ARN-367 leftover after #257).
//
// /api/search used to rank ONLY taste vectors via Temper.Nearest. A featured
// language that is a live home card can still be absent from that kNN set —
// no vector yet, or a proper noun MiniLM maps near a color word ("bluet" →
// blue palettes). Live 2026-08-26: GET /api/search?q=bluet was 200 count 0
// while Bluet (en-019f9a3e-1cbf-78d1-95e0-d4973005f6c8) was on the visitor
// home. ⌘K and MCP searchDesigns already match name/slug against the shelf;
// this is that same match, in a plain ESM module the contract test imports.

export function lexicalScore(query, doc) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!q) return 0;
  const name = String(doc?.name ?? "").toLowerCase();
  const slug = String(doc?.slug ?? "").toLowerCase();
  if (!name && !slug) return 0;
  if (name === q || slug === q) return 1;
  if (name.startsWith(q) || slug.startsWith(q)) return 0.95;
  if (name.includes(q) || slug.includes(q)) return 0.9;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => name.includes(w) || slug.includes(w))) {
    return 0.85;
  }
  const tags = Array.isArray(doc?.tags) ? doc.tags : [];
  if (tags.some((t) => String(t).toLowerCase().includes(q))) return 0.7;
  return 0;
}

/** Score the visitor-shelf (or full) docs; keep only positive matches. */
export function lexicalHits(query, docs, k) {
  const limit = Math.max(1, Math.floor(Number(k) || 8));
  return (Array.isArray(docs) ? docs : [])
    .map((doc) => {
      const score = lexicalScore(query, doc);
      if (score <= 0) return null;
      const tags = (Array.isArray(doc.tags) ? doc.tags : []).filter(
        (t) => typeof t === "string",
      );
      return {
        id: String(doc.id ?? ""),
        kind: doc.kind,
        name: String(doc.name ?? ""),
        slug: String(doc.slug ?? ""),
        score,
        tags,
      };
    })
    .filter((hit) => hit && hit.id)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Name matches first (they already score ≥ 0.7), then meaning, de-duped. */
export function mergeSearchHits(lexical, semantic, k) {
  const limit = Math.max(1, Math.floor(Number(k) || 8));
  const seen = new Set();
  const out = [];
  for (const hit of [...(lexical ?? []), ...(semantic ?? [])]) {
    if (!hit || !hit.id) continue;
    const key = `${hit.kind}:${hit.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}
