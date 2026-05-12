#!/usr/bin/env node

const apiUrl = requiredEnv("TEMPER_API_URL").replace(/\/+$/, "");
const apiKey = requiredEnv("TEMPER_API_KEY");
const tenant = process.env.TEMPER_TENANT || "default";
const limit = Number(process.env.KATAGAMI_BACKFILL_LIMIT || "0");
const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

const headers = {
  "Authorization": `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  "X-Tenant-Id": tenant,
};

const languages = await fetchPublishedLanguages();
const candidates = languages
  .filter((language) => {
    const fields = language.fields ?? {};
    if (!fields.thumbnail_file_id || !fields.embodiment_file_id || !fields.design_md_file_id) {
      return false;
    }
    if (force) return true;
    return (
      !fields.thumbnail_asset_url ||
      !fields.embodiment_asset_url ||
      !fields.design_md_asset_url
    );
  })
  .slice(0, limit > 0 ? limit : undefined);

console.log(`published languages: ${languages.length}`);
console.log(`asset backfill candidates: ${candidates.length}`);
if (dryRun) {
  for (const language of candidates) {
    console.log(`${language.entity_id}\t${language.fields?.name ?? ""}`);
  }
  process.exit(0);
}

let updated = 0;
for (const language of candidates) {
  const fields = language.fields ?? {};
  const languageId = language.entity_id;
  const name = fields.name ?? languageId;

  const thumbnail = await publishArtifact(languageId, fields.thumbnail_file_id, "thumbnail");
  const embodiment = await publishArtifact(languageId, fields.embodiment_file_id, "embodiment");
  const designMd = await publishArtifact(languageId, fields.design_md_file_id, "design_md");

  await postJson(
    `/tdata/DesignLanguages('${encodeODataKey(languageId)}')/Temper.AttachPublishedAssets`,
    {
      thumbnail_asset_id: thumbnail.id,
      thumbnail_asset_url: thumbnail.public_url,
      embodiment_asset_id: embodiment.id,
      embodiment_asset_url: embodiment.public_url,
      design_md_asset_id: designMd.id,
      design_md_asset_url: designMd.public_url,
    },
  );

  updated += 1;
  console.log(`updated ${updated}/${candidates.length}: ${languageId}\t${name}`);
}

console.log(`done: ${updated} language asset records attached`);

async function fetchPublishedLanguages() {
  const rows = [];
  let path = "/tdata/DesignLanguages?$filter=Status%20eq%20%27Published%27&$top=200";
  while (path) {
    const page = await getJson(path);
    rows.push(...(page.value ?? []));
    path = page["@odata.nextLink"]
      ? page["@odata.nextLink"].replace(apiUrl, "")
      : "";
  }
  return rows;
}

async function publishArtifact(languageId, fileId, label) {
  const response = await postJson("/api/files/publish-artifact", {
    file_id: fileId,
    label,
    owner_ref_type: "DesignLanguage",
    owner_ref_id: languageId,
    namespace: "katagami/design-languages",
  });
  return response.artifact;
}

async function getJson(path) {
  const response = await fetch(`${apiUrl}${path}`, { headers });
  return parseResponse(response, path);
}

async function postJson(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return parseResponse(response, path);
}

async function parseResponse(response, path) {
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.error || text || response.statusText;
    throw new Error(`${path} failed with HTTP ${response.status}: ${message}`);
  }
  return body;
}

function encodeODataKey(value) {
  return String(value).replaceAll("'", "''");
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
