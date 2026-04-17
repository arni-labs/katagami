#!/usr/bin/env node
// One-shot migration: local OpenPaw/Temper -> Railway OpenPaw/Temper.
//
// Usage:
//   LOCAL_URL=http://localhost:3500 \
//   RAILWAY_URL=https://openpaw-production.up.railway.app \
//   RAILWAY_TOKEN=<bearer> \
//   TENANT=default \
//   node ui/scripts/migrate-to-railway.mjs [--apply]
//
// Default is dry-run: prints the planned actions without hitting Railway.
// Pass --apply to actually POST.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const L  = process.env.LOCAL_URL  || "http://localhost:3500";
const R  = process.env.RAILWAY_URL || "https://openpaw-production.up.railway.app";
const LT = process.env.LOCAL_TENANT || "default";
const RT = process.env.TENANT || "default";
const TOKEN = process.env.RAILWAY_TOKEN || "";
const APPLY = process.argv.includes("--apply");
const STAGE = "/tmp/katagami-migration";

const ENTITY_SETS = [
  "DesignLanguages",
  "Taxonomies",
  "DesignElements",
  "DesignSources",
  "ElementManifests",
];

// Per-entity action planners. Each returns an ordered list of
// { action, params } to replay local state onto Railway.
const PLANNERS = {
  DesignLanguages(e) {
    const f = e.fields || {};
    const steps = [];
    if (f.name)              steps.push({ action: "SetName",              params: { name: f.name } });
    if (f.philosophy)        steps.push({ action: "WritePhilosophy",      params: { philosophy: f.philosophy } });
    if (f.tokens)            steps.push({ action: "SetTokens",            params: { tokens: f.tokens } });
    if (f.rules)             steps.push({ action: "SetRules",             params: { rules: f.rules } });
    if (f.layout_principles) steps.push({ action: "SetLayout",            params: { layout_principles: f.layout_principles } });
    if (f.guidance)          steps.push({ action: "SetGuidance",          params: { guidance: f.guidance } });
    if (f.imagery_direction) steps.push({ action: "SetImageryDirection",  params: { imagery_direction: f.imagery_direction } });
    if (f.generative_canvas) steps.push({ action: "SetGenerativeCanvas",  params: { generative_canvas: f.generative_canvas } });
    if (f.embodiment_file_id) steps.push({ action: "AttachEmbodiment",    params: { embodiment_file_id: f.embodiment_file_id } });
    if (f.thumbnail_file_id)  steps.push({ action: "AttachThumbnail",     params: { thumbnail_file_id: f.thumbnail_file_id } });
    if (f.taxonomy_ids)      steps.push({ action: "SetTaxonomy",          params: { taxonomy_ids: f.taxonomy_ids } });
    if (f.tags)              steps.push({ action: "SetTags",              params: { tags: f.tags } });
    if (f.parent_ids)        steps.push({ action: "SetLineage",           params: { parent_ids: f.parent_ids, lineage_type: f.lineage_type || "original", generation_number: f.generation_number || "0" } });
    if (f.source_ids)        steps.push({ action: "SetSources",           params: { source_ids: f.source_ids } });
    if (f.curator_notes)     steps.push({ action: "AddCuratorNotes",      params: { curator_notes: f.curator_notes } });
    if (e.status === "UnderReview" || e.status === "Published" || e.status === "Archived")
      steps.push({ action: "SubmitForReview", params: {} });
    if (e.status === "Published" || e.status === "Archived")
      steps.push({ action: "Publish", params: {} });
    if (e.status === "Archived")
      steps.push({ action: "Archive", params: {} });
    return steps;
  },
  Taxonomies(e) {
    const f = e.fields || {};
    const steps = [];
    steps.push({ action: "Define", params: { name: f.name || "", description: f.description || "", parent_id: f.parent_id || "", characteristics: f.characteristics || "", historical_context: f.historical_context || "" } });
    if (f.related_taxonomy_ids) steps.push({ action: "UpdateRelations", params: { related_taxonomy_ids: f.related_taxonomy_ids } });
    if (e.status === "Published" || e.status === "Archived")
      steps.push({ action: "Publish", params: {} });
    if (e.status === "Archived")
      steps.push({ action: "Archive", params: {} });
    return steps;
  },
  DesignElements(e) {
    const f = e.fields || {};
    const steps = [];
    steps.push({ action: "Configure", params: { design_language_id: f.design_language_id, element_key: f.element_key, category: f.category } });
    if (e.status === "Rendered" || e.status === "Verified")
      steps.push({ action: "Render", params: { html: f.html || "" } });
    if (e.status === "Verified")
      steps.push({ action: "Verify", params: {} });
    return steps;
  },
  DesignSources(e) {
    const f = e.fields || {};
    const steps = [];
    steps.push({ action: "Submit", params: { title: f.title || "", source_type: f.source_type || "", source_url: f.source_url || "", metadata: f.metadata || "{}" } });
    if (e.status === "Indexed")
      steps.push({ action: "Index", params: { extracted_topics: f.extracted_topics || "[]", derived_language_ids: f.derived_language_ids || "[]" } });
    if (e.status === "Failed")
      steps.push({ action: "IndexFailed", params: { error_message: f.error_message || "" } });
    return steps;
  },
  ElementManifests(e) {
    const f = e.fields || {};
    const steps = [];
    if (f.elements)     steps.push({ action: "SetElements",     params: { elements: f.elements } });
    if (f.compositions) steps.push({ action: "SetCompositions", params: { compositions: f.compositions } });
    if (e.status === "Active" || e.status === "Superseded")
      steps.push({ action: "Activate", params: {} });
    if (e.status === "Superseded")
      steps.push({ action: "Supersede", params: {} });
    return steps;
  },
};

// Which app namespace each entity set belongs to (for action dispatch paths).
const NAMESPACE = {
  DesignLanguages:  "KatagamiCommons",
  Taxonomies:       "KatagamiCommons",
  DesignElements:   "KatagamiCommons",
  DesignSources:    "KatagamiCommons",
  ElementManifests: "KatagamiCommons",
};

const headers = (tenant) => ({
  "Content-Type": "application/json",
  "X-Tenant-Id": tenant,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
});

async function getJson(url, tenant) {
  const res = await fetch(url, { headers: headers(tenant) });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function post(url, body, tenant) {
  if (!APPLY) { console.log(`  [dry] POST ${url}`); return; }
  const res = await fetch(url, { method: "POST", headers: headers(tenant), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}: ${await res.text()}`);
}

async function exportLocal() {
  if (!existsSync(STAGE)) await mkdir(STAGE, { recursive: true });
  console.log(`\n[1/3] Exporting from ${L} (tenant=${LT}) -> ${STAGE}`);
  for (const set of ENTITY_SETS) {
    try {
      const data = await getJson(`${L}/tdata/${set}`, LT);
      await writeFile(`${STAGE}/${set}.json`, JSON.stringify(data, null, 2));
      console.log(`  ${set}: ${data.value?.length ?? 0} entities`);
    } catch (err) {
      console.error(`  ${set}: export failed -> ${err.message}`);
    }
  }
}

async function planAndApply() {
  console.log(`\n[2/3] Planning action sequences (dry=${!APPLY})`);
  for (const set of ENTITY_SETS) {
    const stagePath = `${STAGE}/${set}.json`;
    if (!existsSync(stagePath)) { console.log(`  ${set}: no export, skipping`); continue; }
    const entities = JSON.parse(await readFile(stagePath, "utf8")).value || [];
    const planner = PLANNERS[set];
    const ns = NAMESPACE[set];
    console.log(`\n  ${set} (${entities.length} entities)`);
    for (const e of entities) {
      const steps = planner(e);
      console.log(`    ${e.entity_id} [status=${e.status}] -> ${steps.length} actions`);
      // Create shell entity
      await post(`${R}/tdata/${set}`, { entity_id: e.entity_id }, RT);
      for (const s of steps) {
        await post(`${R}/tdata/${set}('${e.entity_id}')/${ns}.${s.action}`, s.params, RT);
      }
    }
  }
}

async function uploadFiles() {
  console.log(`\n[3/3] File migration: SKIPPED in scaffold — needs paw-fs write endpoint confirmation.`);
  console.log(`  TODO: iterate DesignLanguages[].fields.{embodiment,thumbnail}_file_id,`);
  console.log(`        GET each from local /tdata/Files('<id>')/$value,`);
  console.log(`        push through paw-fs on Railway, capture remap, patch entity fields.`);
}

(async () => {
  console.log(`=== Katagami migration ===`);
  console.log(`  Source: ${L}  (tenant=${LT})`);
  console.log(`  Target: ${R}  (tenant=${RT})`);
  console.log(`  Token:  ${TOKEN ? "SET" : "MISSING"}`);
  console.log(`  Mode:   ${APPLY ? "APPLY" : "DRY-RUN"}`);
  try {
    await exportLocal();
    await planAndApply();
    await uploadFiles();
    console.log(`\nDone.`);
  } catch (err) {
    console.error(`\nFATAL: ${err.message}`);
    process.exit(1);
  }
})();
