#!/usr/bin/env node
// Backfill semantic taste vectors onto existing DesignLanguages.
//
// For every published language missing a current-model taste_vector, this
// embeds its canonical taste document via the Katagami embed service
// (single source of truth for the document format) and dispatches the
// AttachTasteVector action on the Temper API.
//
// Requires the deployed commons app to expose AttachTasteVector — until
// that app version is installed, dispatches will fail with a clear error.
//
// Env:
//   TEMPER_API_URL        Temper OData base (required)
//   TEMPER_API_KEY        bearer for both Temper and the embed service (required)
//   TEMPER_TENANT         tenant id (default: "default")
//   KATAGAMI_EMBED_URL    embed endpoint (default: http://localhost:3000/api/taste/embed)
// Flags: --dry-run  list candidates without writing
//        --force    recompute even when a current-model vector exists

const EXPECTED_MODEL = "Xenova/all-MiniLM-L6-v2";

const apiUrl = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const apiKey = requiredEnv("TEMPER_API_KEY");
const tenant = process.env.TEMPER_TENANT || "default";
const embedUrl =
  process.env.KATAGAMI_EMBED_URL || "http://localhost:3000/api/taste/embed";
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "X-Tenant-Id": tenant,
};

// All three lanes share the contract: AttachTasteVector(taste_vector,
// taste_vector_model) on the entity, document built by the embed service.
const LANES = [
  {
    set: "DesignLanguages",
    embedBody: (fields) => {
      const tokens = parseJson(fields.tokens) ?? {};
      return {
        kind: "language",
        name: fields.name,
        tags: parseJson(fields.tags) ?? [],
        philosophy_summary: (parseJson(fields.philosophy) ?? {}).summary ?? "",
        heading_font: tokens.typography?.heading_font ?? "",
        body_font: tokens.typography?.body_font ?? "",
        colors: tokens.colors ?? {},
      };
    },
  },
  {
    set: "PaletteSystems",
    embedBody: (fields) => ({
      kind: "palette",
      name: fields.name,
      tags: parseJson(fields.tags) ?? [],
      signature: parseJson(fields.signature) ?? [],
      neutrals: parseJson(fields.neutrals) ?? {},
      semantic: parseJson(fields.semantic) ?? {},
      mood: parseJson(fields.mood) ?? {},
    }),
  },
  {
    set: "ArtStyles",
    embedBody: (fields) => ({
      kind: "art-style",
      name: fields.name,
      tags: parseJson(fields.tags) ?? [],
      medium: fields.medium ?? "",
      prompt_template: fields.prompt_template ?? "",
    }),
  },
];

let totalUpdated = 0;
for (const lane of LANES) {
  const entities = await fetchPublished(lane.set);
  const candidates = entities.filter((entity) => {
    const fields = entity.fields ?? {};
    if (!fields.name) return false;
    if (force) return true;
    return fields.taste_vector_model !== EXPECTED_MODEL || !fields.taste_vector;
  });

  console.log(`${lane.set}: ${entities.length} published, ${candidates.length} candidates`);
  if (dryRun) {
    for (const entity of candidates) {
      console.log(`  ${entity.entity_id}\t${entity.fields?.name ?? ""}`);
    }
    continue;
  }

  for (const entity of candidates) {
    const fields = entity.fields ?? {};
    const id = entity.entity_id;
    const name = fields.name ?? id;

    const embedRes = await fetch(embedUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(lane.embedBody(fields)),
    });
    if (!embedRes.ok) {
      throw new Error(`embed service failed for ${name}: HTTP ${embedRes.status}`);
    }
    const { model, vector } = await embedRes.json();
    if (!Array.isArray(vector) || !model) {
      throw new Error(`embed service returned no vector for ${name}`);
    }

    await postJson(
      `/tdata/${lane.set}('${encodeURIComponent(id)}')/Temper.AttachTasteVector`,
      { taste_vector: JSON.stringify(vector), taste_vector_model: model },
    );
    totalUpdated += 1;
    console.log(`  attached ${vector.length}-dim vector (${model}) → ${name}`);
  }
}

console.log(dryRun ? "dry run complete" : `done: ${totalUpdated} entities updated`);

// ── helpers ──

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

function parseJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchPublished(set) {
  const out = [];
  let url = `${apiUrl}/tdata/${set}?$filter=${encodeURIComponent("Status eq 'Published'")}&$top=1000`;
  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`list ${set} failed: HTTP ${res.status}`);
    const data = await res.json();
    for (const row of data.value ?? []) {
      out.push(normalizeRow(row, set));
    }
    url = data["@odata.nextLink"]
      ? new URL(data["@odata.nextLink"], apiUrl).toString()
      : null;
  }
  return out;
}

function normalizeRow(row, set) {
  if (row && typeof row.fields === "object" && row.fields !== null) {
    return { entity_id: row.entity_id, fields: row.fields };
  }
  const fields = {};
  let entityId = row.entity_id ?? "";
  for (const [key, value] of Object.entries(row)) {
    if (key === "@odata.id" && typeof value === "string") {
      const match = value.match(new RegExp(`${set}\\('([^']+)'\\)`));
      if (match) entityId = match[1];
      continue;
    }
    if (key.startsWith("@odata.")) continue;
    if (typeof value === "string") fields[key] = value;
  }
  if (!entityId && fields.Id) entityId = fields.Id;
  return { entity_id: entityId, fields };
}

async function postJson(path, body) {
  const res = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res;
}
