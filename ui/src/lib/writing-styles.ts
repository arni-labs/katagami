import { getFileUrl, parseJson, type LaneEntity } from "@/lib/odata";
import type { WritingStyleCellLink } from "@/lib/encyclopedia";

// A WritingStyles row reduced to what the writing pages read. Every field here
// is on the record; nothing is invented, and empties stay empty.

export interface Exemplar {
  text: string;
  annotation?: string;
  kind?: string;
}

export interface Credit {
  name: string;
  kind?: string;
  note?: string;
}

export interface WritingStyleSpecimen {
  id: string;
  name: string;
  slug: string;
  status: string;
  persona: string;
  register: Record<string, string>;
  toneScales: Record<string, string>;
  vocabulary: { use: string[]; ban: string[] };
  moves: string[];
  refusals: string[];
  exemplars: Exemplar[];
  credits: Credit[];
  tags: string[];
  consentBasis: string;
  voiceMdUrl: string;
  thumbnail: string;
  bands: Record<string, string>;
  cells: WritingStyleCellLink[];
}

export const BASIS_LABEL: Record<string, string> = {
  opt_in: "consented voice",
  public_domain: "public domain",
  original: "original register",
};

export const CREDIT_KIND_LABEL: Record<string, string> = {
  writer: "Writer",
  movement: "Movement",
  translator: "Translator",
  tradition: "Tradition",
};

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function asStringList(raw: unknown): string[] {
  const parsed = parseJson<unknown>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map(asText).filter(Boolean);
}

function asRecord(raw: unknown): Record<string, string> {
  const parsed = parseJson<unknown>(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, asText(value)]).filter(([, value]) => value !== ""));
}

export function toWritingStyleSpecimen(row: LaneEntity, cells: WritingStyleCellLink[] = []): WritingStyleSpecimen {
  const f = row.fields;
  const consent = parseJson<{ basis?: string }>(f.consent) ?? {};
  const vocabulary = parseJson<{ use?: unknown[]; ban?: unknown[] }>(f.vocabulary) ?? {};
  const exemplars = (parseJson<Array<{ text?: unknown; annotation?: unknown; kind?: unknown }>>(f.exemplars) ?? [])
    .map((e) => ({ text: asText(e?.text).trim(), annotation: asText(e?.annotation).trim() || undefined, kind: asText(e?.kind).trim() || undefined }))
    .filter((e) => e.text);
  const credits = (parseJson<Array<{ name?: unknown; kind?: unknown; note?: unknown }>>(f.credits) ?? [])
    .map((c) => ({ name: asText(c?.name).trim(), kind: asText(c?.kind).trim() || undefined, note: asText(c?.note).trim() || undefined }))
    .filter((c) => c.name);
  return {
    id: row.entity_id,
    name: f.name ?? "Untitled voice",
    slug: f.slug ?? "",
    status: row.status,
    persona: f.persona ?? "",
    register: asRecord(f.register),
    toneScales: asRecord(f.tone_scales),
    vocabulary: { use: (vocabulary.use ?? []).map(asText).filter(Boolean), ban: (vocabulary.ban ?? []).map(asText).filter(Boolean) },
    moves: asStringList(f.moves),
    refusals: asStringList(f.refusals),
    exemplars,
    credits,
    tags: asStringList(f.tags),
    consentBasis: consent.basis ?? "",
    voiceMdUrl: (f.voice_md_asset_url ?? "").trim() || (f.voice_md_file_id ? getFileUrl(f.voice_md_file_id) : ""),
    thumbnail: (f.thumbnail_asset_url ?? "").trim() || (f.thumbnail_file_id ? getFileUrl(f.thumbnail_file_id) : ""),
    bands: asRecord(f.mechanical_bands),
    cells,
  };
}

/** The credit line under a passage: who or what the voice is after. */
export function creditLine(specimen: WritingStyleSpecimen): string {
  const writers = specimen.credits.filter((c) => c.kind === "writer").map((c) => c.name);
  const movements = specimen.credits.filter((c) => c.kind === "movement").map((c) => c.name);
  const other = specimen.credits.filter((c) => c.kind !== "writer" && c.kind !== "movement").map((c) => c.name);
  const parts: string[] = [];
  if (writers.length) parts.push(`after ${writers.join(" + ")}`);
  if (movements.length) parts.push(movements.join(", "));
  if (!parts.length && other.length) parts.push(other.join(", "));
  return parts.join(" · ");
}

// ── Facets, derived from the records themselves ──────────────────────────────

export type FacetKey = "status" | "register" | "tags" | "creditKind" | "basis";

export interface Facet {
  key: FacetKey;
  label: string;
  values: Array<{ value: string; label: string; count: number }>;
}

export type FacetSelection = Partial<Record<FacetKey, string[]>>;

function valuesFor(specimen: WritingStyleSpecimen, key: FacetKey): string[] {
  switch (key) {
    case "status": return [specimen.status];
    case "register": return Object.keys(specimen.register);
    case "tags": return specimen.tags;
    case "creditKind": return [...new Set(specimen.credits.map((c) => c.kind ?? "uncredited"))];
    case "basis": return specimen.consentBasis ? [specimen.consentBasis] : [];
  }
}

const STATUS_LABEL: Record<string, string> = { Published: "Published", UnderReview: "Under review", Draft: "Draft", Archived: "Archived" };

function labelFor(key: FacetKey, value: string): string {
  if (key === "status") return STATUS_LABEL[value] ?? value;
  if (key === "creditKind") return CREDIT_KIND_LABEL[value] ?? value;
  if (key === "basis") return BASIS_LABEL[value] ?? value;
  return value.replace(/[_-]+/g, " ");
}

export function buildFacets(specimens: WritingStyleSpecimen[]): Facet[] {
  const defs: Array<{ key: FacetKey; label: string }> = [
    { key: "status", label: "Status" },
    { key: "register", label: "Register" },
    { key: "creditKind", label: "Credited to" },
    { key: "basis", label: "Basis" },
    { key: "tags", label: "Tags" },
  ];
  return defs
    .map(({ key, label }) => {
      const counts = new Map<string, number>();
      for (const specimen of specimens) for (const value of valuesFor(specimen, key)) counts.set(value, (counts.get(value) ?? 0) + 1);
      const values = [...counts.entries()]
        .map(([value, count]) => ({ value, label: labelFor(key, value), count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
      return { key, label, values };
    })
    .filter((facet) => facet.values.length > 0);
}

export function applyFilters(specimens: WritingStyleSpecimen[], selection: FacetSelection, query: string): WritingStyleSpecimen[] {
  const q = query.trim().toLowerCase();
  return specimens.filter((specimen) => {
    for (const [key, chosen] of Object.entries(selection) as Array<[FacetKey, string[] | undefined]>) {
      if (!chosen?.length) continue;
      const have = valuesFor(specimen, key);
      // Within one facet any chosen value matches; across facets all must.
      if (!chosen.some((value) => have.includes(value))) return false;
    }
    if (!q) return true;
    const haystack = [specimen.name, specimen.persona, ...specimen.tags, ...specimen.exemplars.map((e) => e.text), ...specimen.credits.map((c) => c.name), ...specimen.cells.map((c) => c.cellName)].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}
