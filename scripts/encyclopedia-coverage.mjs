#!/usr/bin/env node
// Coverage of the encyclopedia's sources: how much of each has been read and decided.
// Read-only. Reads .agents/skills/encyclopedia/sources/*.json and prints one table.
// Also validates every term row, so a malformed ledger fails loudly here and in tests.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
export const SOURCES_DIR = path.join(here, "..", ".agents", "skills", "encyclopedia", "sources");

const USES = ["cleanup", "read-and-cite", "names-only", "read-never-copy", "with-care", "edges", "backbone", "human-read-cite-only", "cite-only"];
const READING_DECISIONS = ["cell", "merge", "declined", "deferred", "live"];
const CLEANUP_DECISIONS = ["keep", "revise", "merge", "archive", "live"];
const nonBlank = (value) => typeof value === "string" && value.trim().length > 0;

export function validateSource(source, file) {
  const errors = [];
  const fail = (message) => errors.push(`${file}: ${message}`);
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    fail("the ledger must be a JSON object");
    return errors;
  }
  for (const key of ["source", "name", "url", "licence", "use", "totalDerivedFrom", "lane"]) {
    if (!nonBlank(source[key])) fail(`${key} must be a non-blank string`);
  }
  if (!USES.includes(source.use)) fail(`use must be one of ${USES.join(", ")}`);
  if (!["visual", "writing", "both"].includes(source.lane)) fail("lane must be visual, writing or both");
  if (source.total !== null && !(Number.isInteger(source.total) && source.total > 0)) fail("total must be a positive integer or null");
  if (!Array.isArray(source.terms)) fail("terms must be an array");
  const allowed = source.use === "cleanup" ? CLEANUP_DECISIONS : READING_DECISIONS;
  const seen = new Set();
  const seenRefs = new Set();
  const terms = Array.isArray(source.terms) ? source.terms : [];
  for (const [index, term] of terms.entries()) {
    const where = `terms[${index}]`;
    if (term === null || typeof term !== "object") {
      fail(`${where} must be an object`);
      continue;
    }
    if (!nonBlank(term.term)) fail(`${where}.term must be a non-blank string`);
    if (!nonBlank(term.ref)) fail(`${where}.ref must be a non-blank string (the source page or record)`);
    if (!allowed.includes(term.decision)) fail(`${where}.decision must be one of ${allowed.join(", ")}`);
    if (!nonBlank(term.batch)) fail(`${where}.batch must name the proposal (e.g. B5)`);
    if (!nonBlank(term.note)) fail(`${where}.note must say why, in one line`);
    const needsCell = source.use === "cleanup" ? allowed.includes(term.decision) : ["merge", "live"].includes(term.decision);
    if (needsCell && !nonBlank(term.cellId)) {
      fail(`${where}.cellId is required when the decision is ${term.decision}`);
    }
    if (term.cellId !== undefined && !nonBlank(term.cellId)) fail(`${where}.cellId must be a non-blank string when present`);
    if (nonBlank(term.term)) {
      const key = term.term.trim().toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) fail(`${where}.term "${term.term}" is decided twice`);
      seen.add(key);
    }
    if (nonBlank(term.ref)) {
      const ref = term.ref.trim();
      if (seenRefs.has(ref)) fail(`${where}.ref "${ref}" is decided twice`);
      seenRefs.add(ref);
    }
  }
  if (source.total !== null && terms.length > source.total) fail("more terms decided than the source holds");
  return errors;
}

export function loadSources(dir = SOURCES_DIR) {
  const files = readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".json")).sort();
  const sources = [];
  const errors = [];
  for (const file of files) {
    let source;
    try {
      source = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    } catch (error) {
      errors.push(`${file}: not valid JSON (${error.message})`);
      continue;
    }
    errors.push(...validateSource(source, file));
    if (source && `${source.source}.json` !== file) errors.push(`${file}: file name must equal the source id`);
    if (source && typeof source === "object") sources.push({ ...source, terms: Array.isArray(source.terms) ? source.terms : [] });
  }
  return { sources, errors };
}

export function summarize(source) {
  const counts = {};
  for (const term of source.terms) counts[term.decision] = (counts[term.decision] ?? 0) + 1;
  const decided = source.terms.length;
  const coverage = source.total && source.use !== "backbone" ? decided / source.total : null;
  return { decided, counts, coverage };
}

function renderTable(sources) {
  const columns = ["source", "lane", "use", "total", "decided", "coverage", "decisions"];
  const rows = sources.map((source) => {
    const { decided, counts, coverage } = summarize(source);
    return {
      source: source.source,
      lane: source.lane,
      use: source.use,
      total: source.total === null ? "—" : String(source.total),
      decided: String(decided),
      coverage: source.use === "backbone" ? `${decided} cells with an id` : coverage === null ? "—" : `${Math.round(coverage * 100)}%`,
      decisions: Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(", ") || "—",
    };
  });
  const widths = Object.fromEntries(columns.map((column) => [column, Math.max(column.length, ...rows.map((row) => row[column].length))]));
  const line = (row) => columns.map((column) => row[column].padEnd(widths[column])).join("  ");
  return [line(Object.fromEntries(columns.map((column) => [column, column]))), ...rows.map(line)].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { sources, errors } = loadSources();
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(renderTable(sources));
}
