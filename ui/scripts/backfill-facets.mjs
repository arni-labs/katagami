// Backfill precomputed gallery facets (search_blob, hue_bucket, family_id) onto
// every Published DesignLanguage via the AttachComputedFacets action. Idempotent
// + additive (re-runnable; nothing deleted). DRY-RUN by default; pass --apply to
// write. Concurrency capped at 10 (batch-pipeline limit).
//
// Env (source .env.katagami-curator.local — points at openpaw-production):
//   TEMPER_API_URL, TEMPER_API_KEY, TEMPER_TENANT (default "default")
//
// Reads the canonical (unprojected) rows so tokens + taxonomy_ids are present
// (a $select projection drops list fields — ARN-97).
import { hueBucket, familyId, searchBlob } from "./facets.mjs";

const API = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const KEY = requiredEnv("TEMPER_API_KEY");
const TENANT = process.env.TEMPER_TENANT || "default";
const APPLY = process.argv.includes("--apply");
const CONCURRENCY = 10;
// Namespace fallback, mirroring the app's dispatchAction (AttachTasteVector
// resolves as Temper.* today; try the others if the kernel disagrees).
const NAMESPACES = ["Temper", "KatagamiCommons", "Katagami.Curation", "Katagami"];
const H = { "X-Tenant-Id": TENANT, Authorization: `Bearer ${KEY}` };

async function collectAll(path) {
  const out = [];
  let url = `${API}/tdata/${path}`;
  while (url) {
    const res = await fetch(url, { headers: H });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${await res.text()}`);
    const j = await res.json();
    out.push(...(j.value ?? []));
    url = j["@odata.nextLink"] ?? null;
  }
  return out;
}

function fieldsOf(row) {
  let f = row.fields ?? row;
  if (f && f.fields && typeof f.fields === "object") f = f.fields;
  return f ?? {};
}

async function attach(id, facets) {
  let lastErr = "";
  for (const ns of NAMESPACES) {
    const res = await fetch(
      `${API}/tdata/DesignLanguages('${id}')/${ns}.AttachComputedFacets`,
      { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(facets) },
    );
    if (res.ok) return ns;
    lastErr = `${ns} -> ${res.status}: ${(await res.text()).slice(0, 160)}`;
    if (res.status !== 404) break; // 404 = wrong namespace; anything else is a real error
  }
  throw new Error(lastErr);
}

async function main() {
  const taxRows = await collectAll("Taxonomies?$top=5000");
  const taxIndex = new Map();
  for (const r of taxRows) {
    const id = r.entity_id ?? fieldsOf(r).Id;
    if (!id) continue;
    const f = fieldsOf(r);
    taxIndex.set(id, { parentId: String(f.parent_id ?? f.ParentId ?? "").trim() });
  }
  console.log(`taxonomy nodes: ${taxIndex.size}`);

  // $top must exceed the corpus in one page: the kernel caps a page and omits
  // @odata.nextLink (ARN-97 class), so a small $top silently drops the tail.
  const langs = await collectAll("DesignLanguages?$filter=Status eq 'Published'&$top=5000");
  console.log(`published languages: ${langs.length}   mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const items = langs.map((row) => {
    const f = fieldsOf(row);
    return {
      id: row.entity_id ?? f.Id,
      name: f.name,
      facets: {
        search_blob: searchBlob(f.name, f.tags, f.philosophy),
        hue_bucket: hueBucket(f.tokens),
        family_id: familyId(f.taxonomy_ids, taxIndex),
      },
    };
  });

  const hueDist = {};
  const famCount = items.filter((i) => i.facets.family_id).length;
  for (const it of items) hueDist[it.facets.hue_bucket] = (hueDist[it.facets.hue_bucket] || 0) + 1;
  console.log("hue distribution:", JSON.stringify(hueDist));
  console.log(`family_id resolved: ${famCount}/${items.length}`);
  console.log("sample:", JSON.stringify(items.slice(0, 4).map((i) => ({ name: i.name, hue: i.facets.hue_bucket, fam: i.facets.family_id || "-", blob: i.facets.search_blob.slice(0, 36) })), null, 0));

  if (!APPLY) {
    console.log("\nDRY-RUN — no writes. Re-run with --apply to backfill.");
    return;
  }

  let done = 0, failed = 0, nsUsed = "";
  const queue = [...items];
  async function worker() {
    while (queue.length) {
      const it = queue.shift();
      try {
        nsUsed = await attach(it.id, it.facets);
        done++;
      } catch (e) {
        failed++;
        console.error(`FAIL ${it.id} (${it.name}): ${String(e).slice(0, 200)}`);
      }
      if ((done + failed) % 25 === 0) console.log(`  ${done + failed}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\ndone: ${done} written (via ${nsUsed}.AttachComputedFacets), ${failed} failed`);
}

function requiredEnv(n) {
  const v = process.env[n];
  if (!v) { console.error(`missing env ${n} — source .env.katagami-curator.local`); process.exit(1); }
  return v;
}
main().catch((e) => { console.error(e); process.exit(1); });
