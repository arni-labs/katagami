import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { cellDocumentSchema } from "@/lib/encyclopedia-schema";
import { getFileUrl, listWritingStyles, paletteCore, parseJson, type LaneEntity } from "@/lib/odata";

// The encyclopedia read model. Server-side: fetch the raw EncyclopediaCells
// rows, keep only attested documents (document_validated AND the stored hash
// matches the stored bytes — the boolean alone is not enough, see the skill),
// parse them under the current contract, and resolve every manifestation
// pointer to the record it names. Everything a page shows comes from here.

export type CellDocument = z.infer<typeof cellDocumentSchema>;
export type MapName = CellDocument["maps"][number]["map"];
export type CellSource = CellDocument["sources"][number];
export type CellStudy = CellDocument["studies"][number];
export type CellRelation = CellDocument["relations"][number];
export type CellLink = CellDocument["broader"][number];
export type ManifestationSet = CellDocument["manifestations"][number]["entitySet"];

export const MAP_NAMES: MapName[] = ["art", "writing", "palettes", "design"];

/** The record a manifestation points at, reduced to what a specimen card
 *  needs. `null` means the pointer did not resolve (the record is missing or
 *  unreadable) — the card says so instead of inventing one. */
export interface ManifestationRecord {
  set: ManifestationSet;
  id: string;
  name: string;
  status: string;
  href: string;
  image?: string;
  swatches?: string[];
  /** One line of the record's own voice: a persona, a medium, a philosophy. */
  line?: string;
}

export interface CellManifestation {
  entitySet: ManifestationSet;
  entityId: string;
  explanation: string;
  sourceIds: string[];
  record: ManifestationRecord | null;
}

export interface EncyclopediaCell {
  id: string;
  name: string;
  description: string;
  provenance: CellDocument["provenance"];
  maps: CellDocument["maps"];
  broader: CellLink[];
  relations: CellRelation[];
  questions: string[];
  sources: CellSource[];
  manifestations: CellManifestation[];
  studies: CellStudy[];
  state: string;
}

export interface EncyclopediaGraph {
  cells: EncyclopediaCell[];
  /** Rows present in the collection but not shown: unattested or unparsable. */
  withheld: number;
  total: number;
}

interface RawCellRow {
  entity_id?: string;
  Id?: string;
  state?: string;
  status?: string;
  document?: unknown;
  document_validated?: unknown;
  document_hash?: unknown;
  fields?: Record<string, unknown>;
  booleans?: Record<string, unknown>;
}

function cleanEnv(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? fallback).replace(/\\n/g, "").trim();
  return cleaned || fallback;
}

const API_BASE = cleanEnv(process.env.NEXT_PUBLIC_TEMPER_API_URL, "http://localhost:3500");
const TENANT = cleanEnv(process.env.NEXT_PUBLIC_TEMPER_TENANT, "default");
const API_KEY = cleanEnv(process.env.TEMPER_API_KEY, "");

async function readCellRows(): Promise<RawCellRow[]> {
  const rows: RawCellRow[] = [];
  let next: string | undefined = `${API_BASE}/tdata/EncyclopediaCells`;
  let pages = 0;
  while (next) {
    if (++pages > 50) throw new Error("EncyclopediaCells: pagination exceeded 50 pages");
    const res = await fetch(next, {
      headers: {
        "X-Tenant-Id": TENANT,
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`EncyclopediaCells ${res.status}: ${await res.text()}`);
    const page = (await res.json()) as { value?: RawCellRow[]; "@odata.nextLink"?: string };
    rows.push(...(page.value ?? []));
    const link = page["@odata.nextLink"];
    if (link && new URL(link).origin !== new URL(API_BASE).origin) {
      throw new Error(`Refusing cross-origin nextLink: ${link}`);
    }
    next = link;
  }
  return rows;
}

function field<T = unknown>(row: RawCellRow, key: keyof RawCellRow & string): T | undefined {
  const direct = row[key];
  if (direct !== undefined) return direct as T;
  if (row.booleans?.[key] !== undefined) return row.booleans[key] as T;
  return row.fields?.[key] as T | undefined;
}

/** Attested = validated flag AND sha256(document) == document_hash. A document
 *  that arrives as anything but a string cannot be hashed and is unattested. */
export function attestedDocument(row: RawCellRow): string | null {
  const document = field(row, "document");
  const validated = field(row, "document_validated");
  const hash = field<string>(row, "document_hash");
  if (typeof document !== "string" || !hash) return null;
  if (!(validated === true || validated === "true")) return null;
  return createHash("sha256").update(document, "utf8").digest("hex") === hash ? document : null;
}

function parseCell(row: RawCellRow): Omit<EncyclopediaCell, "manifestations"> & { manifestations: CellDocument["manifestations"] } | null {
  const bytes = attestedDocument(row);
  if (bytes === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(bytes);
  } catch {
    return null;
  }
  const parsed = cellDocumentSchema.safeParse(json);
  if (!parsed.success) return null;
  const id = row.entity_id ?? row.Id ?? (row.fields?.Id as string | undefined);
  if (!id) return null;
  const document = parsed.data;
  return {
    id,
    name: document.name,
    description: document.description,
    provenance: document.provenance,
    maps: document.maps,
    broader: document.broader,
    relations: document.relations,
    questions: document.questions,
    sources: document.sources,
    manifestations: document.manifestations,
    studies: document.studies,
    state: row.state ?? row.status ?? (row.fields?.State as string | undefined) ?? "",
  };
}

// ── Manifestation records ────────────────────────────────────────────────────
// Cells point at hundreds of records (one cell alone names sixty), so records
// are fetched per set in batches of ids with $select, never one request per
// pointer. A pointer whose record does not come back resolves to null and the
// card says so.

const SELECT: Record<ManifestationSet, string[]> = {
  ArtStyles: ["Id", "name", "slug", "status", "thumbnail_asset_url", "thumbnail_file_id", "medium"],
  DesignLanguages: ["Id", "name", "slug", "status", "thumbnail_asset_url", "landing_thumbnail_asset_url", "thumbnail_file_id", "tokens", "philosophy"],
  PaletteSystems: ["Id", "name", "slug", "status", "signature", "mood"],
  WritingStyles: ["Id", "name", "slug", "status", "persona", "thumbnail_asset_url", "thumbnail_file_id"],
};

const BATCH = 20;

function flatFields(row: Record<string, unknown>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith("@odata")) continue;
    if (typeof value === "string") out[key] = value;
    else if (value != null) out[key] = JSON.stringify(value);
  }
  return out;
}

async function fetchRecords(set: ManifestationSet, ids: string[]): Promise<Map<string, Record<string, string | undefined>>> {
  const out = new Map<string, Record<string, string | undefined>>();
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const filter = chunk.map((id) => `Id eq '${id.replace(/'/g, "''")}'`).join(" or ");
    const params = new URLSearchParams({ $filter: filter, $select: SELECT[set].join(","), $top: String(chunk.length) });
    try {
      const res = await fetch(`${API_BASE}/tdata/${set}?${params}`, {
        headers: { "X-Tenant-Id": TENANT, ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${set} ${res.status}: ${await res.text()}`);
      const page = (await res.json()) as { value?: Array<Record<string, unknown>> };
      for (const raw of page.value ?? []) {
        const fields = flatFields(raw);
        const id = fields.Id ?? fields.id;
        if (id) out.set(id, fields);
      }
    } catch (err) {
      console.error(`[encyclopedia] batch read of ${set} failed; ${chunk.length} pointers left unresolved`, err);
    }
  }
  return out;
}

function firstHttps(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = (value ?? "").trim();
    if (/^https:\/\//.test(trimmed) || trimmed.startsWith("/")) return trimmed;
  }
  return undefined;
}

function laneImage(fields: Record<string, string | undefined>): string | undefined {
  const cdn = firstHttps(fields.thumbnail_asset_url, fields.landing_thumbnail_asset_url);
  if (cdn) return cdn;
  const fileId = fields.thumbnail_file_id;
  return fileId ? getFileUrl(fileId) : undefined;
}

function truncate(value: string | undefined, max = 140): string | undefined {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function toRecord(set: ManifestationSet, id: string, f: Record<string, string | undefined>): ManifestationRecord {
  const status = f.status ?? f.Status ?? "";
  switch (set) {
    case "DesignLanguages": {
      const colors = parseJson<{ colors?: Record<string, string | undefined> }>(f.tokens)?.colors ?? {};
      const swatches = [colors.primary, colors.secondary, colors.accent, colors.background]
        .filter((hex): hex is string => typeof hex === "string" && /^#[0-9a-f]{3,8}$/i.test(hex));
      return { set, id, name: f.name ?? "Untitled language", status, href: `/language/${f.slug || id}`, image: laneImage(f), swatches: swatches.length ? swatches : undefined, line: truncate(f.philosophy) };
    }
    case "ArtStyles":
      return { set, id, name: f.name ?? "Untitled art style", status, href: `/art-styles/${f.slug || id}`, image: laneImage(f), line: truncate(f.medium, 80) };
    case "PaletteSystems": {
      const core = paletteCore(f);
      const swatches = core.signature.map((sw) => (sw.hex.startsWith("#") ? sw.hex : `#${sw.hex}`));
      return { set, id, name: f.name ?? "Untitled palette", status, href: `/palettes/${id}`, swatches: swatches.length ? swatches : undefined, line: truncate(core.mood.summary) };
    }
    case "WritingStyles":
      return { set, id, name: f.name ?? "Untitled writing style", status, href: `/voice/${id}`, image: laneImage(f), line: truncate(f.persona) };
  }
}

/** The whole encyclopedia as the pages read it. Owner-gated by the caller. */
export async function loadEncyclopedia(): Promise<EncyclopediaGraph> {
  const rows = await readCellRows();
  const parsed = rows
    .map(parseCell)
    .filter((cell): cell is NonNullable<typeof cell> => cell !== null);

  const idsBySet = new Map<ManifestationSet, Set<string>>();
  for (const cell of parsed) {
    for (const m of cell.manifestations) {
      const set = idsBySet.get(m.entitySet) ?? new Set<string>();
      set.add(m.entityId);
      idsBySet.set(m.entitySet, set);
    }
  }
  const recordByKey = new Map<string, ManifestationRecord | null>();
  await Promise.all([...idsBySet.entries()].map(async ([set, ids]) => {
    const fetched = await fetchRecords(set, [...ids]);
    for (const id of ids) {
      const fields = fetched.get(id);
      recordByKey.set(`${set}:${id}`, fields ? toRecord(set, id, fields) : null);
    }
  }));

  const cells: EncyclopediaCell[] = parsed
    .map((cell) => ({
      ...cell,
      manifestations: cell.manifestations.map((m) => ({
        ...m,
        record: recordByKey.get(`${m.entitySet}:${m.entityId}`) ?? null,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { cells, withheld: rows.length - cells.length, total: rows.length };
}

// ── Writing styles, joined to the cells that claim them ─────────────────────

export interface WritingStyleCellLink {
  cellId: string;
  cellName: string;
  explanation: string;
}

/** Every cell that lists a WritingStyles record as a manifestation, keyed by
 *  the record id. Derived from the cells, never from the styles. */
export function writingStyleCellIndex(graph: EncyclopediaGraph): Map<string, WritingStyleCellLink[]> {
  const index = new Map<string, WritingStyleCellLink[]>();
  for (const cell of graph.cells) {
    for (const m of cell.manifestations) {
      if (m.entitySet !== "WritingStyles") continue;
      const list = index.get(m.entityId) ?? [];
      list.push({ cellId: cell.id, cellName: cell.name, explanation: m.explanation });
      index.set(m.entityId, list);
    }
  }
  return index;
}

/** All writing styles at every status (the lab pages are owner-only, so the
 *  unpublished ones show with their stamp). */
export async function loadAllWritingStyles(): Promise<LaneEntity[]> {
  return listWritingStyles("");
}
