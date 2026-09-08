import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fields = ["name", "slug", "medium", "tags", "guidance", "parent_ids", "lineage_type", "thumbnail_asset_url", "reference_assets", "reference_manifest", "persona", "moves", "refusals", "register", "exemplars", "consent", "model_provenance"];
const statuses = new Set(["Published", "UnderReview", "Draft", "Archived"]);
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);

export function decodeTags(value) {
  if (value === undefined || value === null || value === "") return [];
  const tags = typeof value === "string" ? JSON.parse(value) : value;
  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== "string")) throw new Error("tags must be a string array");
  return tags;
}

export function decodeGuidance(value) {
  if (value === undefined || value === null || value === "") return {};
  if (object(value)) return value;
  if (typeof value !== "string") throw new Error("guidance must be text or an object");
  return value.trim().startsWith("{") ? JSON.parse(value) : value;
}

function checkRow(row) {
  if (!object(row) || typeof row.id !== "string" || !row.id || !statuses.has(row.status) || !object(row.fields) || (row.fields.name !== undefined && typeof row.fields.name !== "string")) {
    throw new Error("invalid inventory record");
  }
}

// The callback must return the raw page envelope. temper.list() discards that
// envelope; call temper.navigate() with the exact path instead. Do not put
// paging options in temper.list()'s filter argument or set a total $top limit.
export async function collectPages(readPage, collection) {
  if (!["ArtStyles", "WritingStyles"].includes(collection)) throw new Error("unsupported collection");
  const visited = new Set();
  const ids = new Set();
  const items = [];
  const pageSizes = [];
  let path = collection;
  while (path) {
    if (typeof path !== "string" || !(path === collection || path.startsWith(`${collection}?`))) throw new Error("invalid continuation path");
    if (visited.has(path)) throw new Error("repeated continuation");
    visited.add(path);
    const page = await readPage(path);
    if (!object(page) || !Array.isArray(page.value)) throw new Error("expected raw page envelope");
    pageSizes.push(page.value.length);
    for (const raw of page.value) {
      if (!object(raw) || !object(raw.fields)) throw new Error("invalid raw record");
      const row = { id: raw.entity_id, status: raw.status, fields: Object.fromEntries(fields.filter(key => key in raw.fields).map(key => [key, raw.fields[key]])) };
      checkRow(row);
      if (ids.has(row.id)) throw new Error("duplicate record id");
      ids.add(row.id);
      items.push(row);
    }
    path = page["@odata.nextLink"];
    if (path !== undefined && path !== null && (typeof path !== "string" || !path)) throw new Error("invalid continuation path");
  }
  return { items, pageSizes, complete: true };
}

export function catalogueSummary(rows) {
  if (!Array.isArray(rows)) throw new Error("expected record array");
  const ids = new Set();
  const counts = {};
  const publishedMedia = new Map();
  const names = new Map();
  const unnamedIds = [];
  for (const row of rows) {
    checkRow(row);
    if (ids.has(row.id)) throw new Error("duplicate record id");
    ids.add(row.id);
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    if (row.status === "Published") {
      const medium = row.fields.medium ?? "unspecified";
      if (typeof medium !== "string") throw new Error("medium must be text");
      publishedMedia.set(medium, (publishedMedia.get(medium) ?? 0) + 1);
    }
    if (!row.fields.name?.trim()) unnamedIds.push(row.id);
    else if (row.status !== "Archived") {
      const key = row.fields.name.trim().toLowerCase();
      const match = names.get(key) ?? { name: row.fields.name, ids: [] };
      match.ids.push(row.id);
      names.set(key, match);
    }
  }
  return { total: rows.length, statuses: counts, publishedMedia: Object.fromEntries(publishedMedia), unnamedIds, repeatedActiveNames: [...names.values()].filter(entry => entry.ids.length > 1) };
}

export function descriptorIssues(rows) {
  const issues = [];
  for (const row of rows) {
    for (const [field, decode] of [["tags", decodeTags], ["guidance", decodeGuidance]]) {
      try { decode(row.fields[field]); }
      catch (error) { issues.push({ id: row.id, field, message: error.message }); }
    }
  }
  return issues;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.argv.length !== 3) throw new Error("usage: node encyclopedia-inventory.mjs SNAPSHOT.json");
  const snapshot = JSON.parse(readFileSync(process.argv[2], "utf8"));
  for (const name of ["art", "writing"]) {
    if (snapshot.complete?.[name] !== true) throw new Error(`${name} inventory is incomplete`);
    const sizes = snapshot.pageSizes?.[name];
    if (!Array.isArray(sizes) || sizes.length === 0 || sizes.some(size => !Number.isInteger(size) || size < 0) || sizes.reduce((sum, size) => sum + size, 0) !== snapshot[name]?.length) throw new Error(`${name} page sizes disagree`);
  }
  console.log(JSON.stringify({ capturedAt: snapshot.capturedAt, art: catalogueSummary(snapshot.art), writing: catalogueSummary(snapshot.writing), descriptorIssues: { art: descriptorIssues(snapshot.art), writing: descriptorIssues(snapshot.writing) } }, null, 2));
}
