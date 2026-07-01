// Backfill a lowercase search_blob onto every Published PaletteSystem + ArtStyle
// via AttachComputedFacets, so the lane galleries get case-insensitive search
// (the kernel has no tolower/$search). DRY-RUN by default; --apply to write.
//
// Env: source .env.katagami-curator.local (openpaw-production).
const API = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const KEY = requiredEnv("TEMPER_API_KEY");
const TENANT = process.env.TEMPER_TENANT || "default";
const APPLY = process.argv.includes("--apply");
const CONCURRENCY = 10;
const NAMESPACES = ["Temper", "KatagamiCommons", "Katagami.Curation", "Katagami"];
const H = { "X-Tenant-Id": TENANT, Authorization: `Bearer ${KEY}` };

const LANES = [
  { set: "PaletteSystems", blob: paletteBlob },
  { set: "ArtStyles", blob: artBlob },
];

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

function join(parts) {
  return parts
    .filter(Boolean)
    .map(String)
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

function tagsOf(f) {
  const t = safeJson(f.tags);
  return Array.isArray(t) ? t.map(String) : [];
}

function paletteBlob(f) {
  const mood = safeJson(f.mood) || {};
  return join([f.name, f.slug, ...tagsOf(f), mood.summary, mood.key_hue, mood.temperature]);
}

function artBlob(f) {
  return join([f.name, f.slug, ...tagsOf(f), f.medium]);
}

async function attach(set, id, facets) {
  let lastErr = "";
  for (const ns of NAMESPACES) {
    const res = await fetch(`${API}/tdata/${set}('${id}')/${ns}.AttachComputedFacets`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify(facets),
    });
    if (res.ok) return ns;
    lastErr = `${ns} -> ${res.status}: ${(await res.text()).slice(0, 160)}`;
    if (res.status !== 404) break;
  }
  throw new Error(lastErr);
}

async function backfillLane(lane) {
  const rows = await collectAll(`${lane.set}?$filter=Status eq 'Published'&$top=5000`);
  const items = rows
    .map((r) => {
      const f = fieldsOf(r);
      return { id: r.entity_id ?? f.Id, search_blob: lane.blob(f) };
    })
    .filter((it) => it.id);
  const withBlob = items.filter((it) => it.search_blob).length;
  console.log(`${lane.set}: ${items.length} published, ${withBlob} with non-empty blob   mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("  sample:", JSON.stringify(items.slice(0, 3).map((i) => i.search_blob.slice(0, 44))));

  if (!APPLY) return;
  let done = 0, failed = 0, ns = "";
  const queue = [...items];
  async function worker() {
    while (queue.length) {
      const it = queue.shift();
      try {
        ns = await attach(lane.set, it.id, { search_blob: it.search_blob });
        done++;
      } catch (e) {
        failed++;
        console.error(`  FAIL ${it.id}: ${String(e).slice(0, 160)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`  ${lane.set}: ${done} written (${ns}.AttachComputedFacets), ${failed} failed`);
}

async function main() {
  for (const lane of LANES) await backfillLane(lane);
  if (!APPLY) console.log("\nDRY-RUN — no writes. Re-run with --apply.");
}

function requiredEnv(n) {
  const v = process.env[n];
  if (!v) { console.error(`missing env ${n} — source .env.katagami-curator.local`); process.exit(1); }
  return v;
}
main().catch((e) => { console.error(e); process.exit(1); });
