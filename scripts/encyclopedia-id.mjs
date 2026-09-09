// A cell's identifier is derived from its approved name and nothing else, so two
// agents naming the same direction land on the same cell. Decompose, drop the
// combining marks and modifier letters (ḥ → h, ʻ → nothing), then slug.
// "Muwashshaḥāt" → muwashshahat, "Muʻāraḍāt" → muaradat, "Cut-ups (Literature)" → cut-ups-literature.
import assert from "node:assert/strict";

export function identifierFor(name) {
  const id = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\p{M}\p{Lm}'’ʼ]/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  assert.match(id, /^[a-z0-9][a-z0-9-]{0,159}$/, `cannot derive an identifier from ${name}`);
  return id;
}
