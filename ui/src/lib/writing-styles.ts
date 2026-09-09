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
  /** How much real prose stands behind the contract — the listing says so on
   *  the card, because an exemplar alone reads like the whole basis. */
  corpusFiles: number;
  corpusWords: number;
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
  const corpus = corpusManifestOf(row);
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
    corpusFiles: corpus.length,
    corpusWords: corpus.reduce((total, item) => total + item.words, 0),
  };
}

// ── The whole of one style, for its own page ─────────────────────────────────

/** One file of the corpus this voice was measured from. */
export interface CorpusItem {
  fileId: string;
  /** Where the words came from — "Pride and Prejudice (1813)" and the like. */
  source: string;
  kind: string;
  words: number;
  /** Read from the file at request time by the page; "" when it could not be read. */
  text: string;
}

/** A replica an LLM wrote from the VOICE.md alone. */
export interface Replication {
  fileId: string;
  model: string;
  provenance: string;
  text: string;
}

export interface Consent {
  basis: string;
  author: string;
  license: string;
  samples: string;
  provenance: string;
}

export interface WritingStyleDetail extends WritingStyleSpecimen {
  /**
   * The bands as stored, nesting intact.
   *
   * `WritingStyleSpecimen.bands` flattens every value to a string for the
   * listing's facets, which turns `{"mean":[8.2,37.9]}` into an escaped string
   * — fine to filter on, unreadable when printed. The page prints this one.
   */
  bandsJson: Record<string, unknown>;
  toneScalesRaw: Record<string, string>;
  consent: Consent;
  corpus: CorpusItem[];
  /** Every word the manifest counts, including files whose text did not load. */
  corpusWords: number;
  replications: Replication[];
  verification: {
    engine: string;
    texts: Record<string, number>;
    checksPassed: string[];
    replicationModels: string[];
  } | null;
  voiceMdFileId: string;
  voiceMd: string;
  parents: Array<{ id: string; name: string }>;
  creditsRaw: string;
  modelProvenanceRaw: string;
}

/** The manifest entries, in record order, before any file is read. */
export function corpusManifestOf(row: LaneEntity): Array<Omit<CorpusItem, "text">> {
  const manifest = parseJson<{ items?: Array<{ file_id?: unknown; source?: unknown; kind?: unknown; words?: unknown }> }>(row.fields.corpus_manifest) ?? {};
  const items = (manifest.items ?? [])
    .map((item) => ({
      fileId: asText(item?.file_id).trim(),
      source: asText(item?.source).trim(),
      kind: asText(item?.kind).trim(),
      words: Number(item?.words) || 0,
    }))
    .filter((item) => item.fileId);
  if (items.length) return items;
  // A record can carry the ids without a manifest; the files are still the corpus.
  return asStringList(row.fields.corpus_file_ids).map((fileId) => ({ fileId, source: "", kind: "", words: 0 }));
}

/** The replication entries, in record order, before any file is read. */
export function replicationManifestOf(row: LaneEntity): Array<Omit<Replication, "text">> {
  const manifest = parseJson<{ items?: Array<{ file_id?: unknown; model?: unknown; loop?: unknown; generated_at?: unknown }> }>(row.fields.replication_manifest) ?? {};
  const byId = new Map(
    (manifest.items ?? []).map((item) => [
      asText(item?.file_id).trim(),
      {
        model: asText(item?.model).trim(),
        provenance: [asText(item?.model).trim(), asText(item?.generated_at).trim(), asText(item?.loop).trim() ? `loop ${asText(item?.loop).trim()}` : ""].filter(Boolean).join(" · "),
      },
    ]),
  );
  return asStringList(row.fields.replication_sample_file_ids).map((fileId) => ({
    fileId,
    model: byId.get(fileId)?.model ?? "",
    provenance: byId.get(fileId)?.provenance ?? "",
  }));
}

/**
 * The record as the detail page reads it. File TEXT is not fetched here — the
 * page reads the files and passes them in — so this stays a pure function of
 * the row and can be exercised without a backend.
 */
export function toWritingStyleDetail(
  row: LaneEntity,
  cells: WritingStyleCellLink[],
  read: { corpus: Map<string, string>; replications: Map<string, string>; voiceMd: string; parents: Array<{ id: string; name: string }> },
): WritingStyleDetail {
  const consent = parseJson<Record<string, unknown>>(row.fields.consent) ?? {};
  const report = parseJson<{
    engine?: unknown;
    texts?: Record<string, number>;
    checks_passed?: unknown;
    compliance?: { checks_passed?: unknown };
    replication?: { models?: unknown };
  }>(row.fields.verification_report);
  const manifest = corpusManifestOf(row);
  const bandsJson = parseJson<Record<string, unknown>>(row.fields.mechanical_bands);
  return {
    ...toWritingStyleSpecimen(row, cells),
    bandsJson: bandsJson && typeof bandsJson === "object" && !Array.isArray(bandsJson) ? bandsJson : {},
    toneScalesRaw: asRecord(row.fields.tone_scales),
    consent: {
      basis: asText(consent.basis).trim(),
      author: asText(consent.author).trim(),
      license: asText(consent.license).trim(),
      samples: asText(consent.samples).trim(),
      provenance: asText(consent.provenance).trim(),
    },
    corpus: manifest.map((item) => ({ ...item, text: read.corpus.get(item.fileId) ?? "" })),
    corpusWords: manifest.reduce((total, item) => total + item.words, 0),
    replications: replicationManifestOf(row)
      .map((item) => ({ ...item, text: read.replications.get(item.fileId) ?? "" }))
      .filter((item) => item.text),
    verification: report
      ? {
          engine: asText(report.engine).trim(),
          texts: report.texts && typeof report.texts === "object" ? report.texts : {},
          checksPassed: [...(Array.isArray(report.compliance?.checks_passed) ? report.compliance.checks_passed : []), ...(Array.isArray(report.checks_passed) ? report.checks_passed : [])].map(asText).filter(Boolean),
          replicationModels: (Array.isArray(report.replication?.models) ? report.replication.models : []).map(asText).filter(Boolean),
        }
      : null,
    voiceMdFileId: (row.fields.voice_md_file_id ?? "").trim(),
    voiceMd: read.voiceMd,
    parents: read.parents,
    creditsRaw: row.fields.credits ?? "",
    modelProvenanceRaw: row.fields.model_provenance ?? "",
  };
}

/**
 * The bands as sentences a writer can follow, from the bands as stored.
 *
 * The VOICE.md carries the contract as JSON under keys like
 * `sentence_openers.max_top_share` and `paragraph_length.stdev_min`. A person
 * reading that cannot act on it, and neither, measurably, can a model: replicas
 * written from the JSON alone failed exactly those two bands — 42% of sentences
 * opening on the same word against a 22% ceiling, and paragraphs of near-equal
 * length against a spread floor of 40.3 words — while passing every band whose
 * meaning is legible from its name. So the same sentences go on the page and
 * into the handoff, and the two that nothing in the key name explains carry the
 * instruction that follows from them.
 */
export function bandSentences(bands: Record<string, unknown>): string[] {
  const out: string[] = [];
  const range = (v: unknown): string | null => (Array.isArray(v) && v.length === 2 ? `${v[0]} to ${v[1]}` : null);
  const sentence = bands.sentence_length as { mean?: unknown; stdev_min?: unknown } | undefined;
  if (sentence?.mean && range(sentence.mean)) out.push(`Sentences average ${range(sentence.mean)} words.`);
  if (sentence?.stdev_min != null) out.push(`Sentence lengths vary by at least ${sentence.stdev_min} words — short and long in the same paragraph.`);
  const openers = bands.sentence_openers as { max_top_share?: unknown } | undefined;
  if (openers?.max_top_share != null) out.push(`No single word opens more than ${Math.round(Number(openers.max_top_share) * 100)}% of sentences — vary how sentences begin.`);
  const paragraph = bands.paragraph_length as { stdev_min?: unknown } | undefined;
  if (paragraph?.stdev_min != null) out.push(`Paragraph lengths vary by at least ${paragraph.stdev_min} words — some paragraphs run much longer than others.`);
  const ttr = bands.type_token_ratio as { min?: unknown; window_words?: unknown } | undefined;
  if (ttr?.min != null) out.push(`At least ${Math.round(Number(ttr.min) * 100)}% of the words in every ${ttr.window_words ?? 500} are distinct.`);
  const hapax = bands.hapax_ratio as { min?: unknown; window_words?: unknown } | undefined;
  if (hapax?.min != null) out.push(`At least ${Math.round(Number(hapax.min) * 100)}% of words appear exactly once per ${hapax.window_words ?? 500}.`);
  const connectives = range(bands.connectives_per_1000_words);
  if (connectives) out.push(`Connectives such as “however” and “thus”: ${connectives} per thousand words.`);
  const fw = bands.function_words as { max_distance?: unknown } | undefined;
  if (fw?.max_distance != null) out.push(`Function words stay within ${fw.max_distance} of the corpus's own distribution.`);
  const tri = bands.char_trigrams as { max_distance?: unknown } | undefined;
  if (tri?.max_distance != null) out.push(`Letter patterns stay within ${tri.max_distance} of the corpus's.`);
  if (Array.isArray(bands.banned_phrases) && bands.banned_phrases.length) out.push(`${bands.banned_phrases.length} phrases are banned outright.`);
  if (bands.min_words_to_evaluate != null) out.push(`Anything shorter than ${bands.min_words_to_evaluate} words is too small to measure.`);
  return out;
}

/**
 * What an agent is handed when it is asked to write in this voice.
 *
 * The VOICE.md is the artifact — it carries the Never list, the gold-standard
 * samples, the measured fingerprint and the mechanical bands — so the handoff
 * is that file with a sentence saying what to do with it. It travels as TEXT
 * rather than as a link because `/voice/<id>/VOICE.md` is owner-gated, so an
 * agent following a link gets a 404; a paste works from any harness.
 *
 * The bands are restated in words above the file. That is not decoration: it is
 * the difference between a replica that passes the checker and one that does
 * not — see `bandSentences`.
 *
 * Returns "" when the record has no VOICE.md, so the page can say so instead of
 * handing over an instruction with nothing behind it.
 */
export function agentHandoff(detail: Pick<WritingStyleDetail, "name" | "voiceMd" | "bandsJson">, address: string): string {
  if (!detail.voiceMd.trim()) return "";
  const source = address ? `\nThe same contract lives at ${address}.` : "";
  const measured = bandSentences(detail.bandsJson);
  // The self-check is the pipeline's own method, not an extra flourish: the
  // finalizer measures a replica and sends it back for revision, and this
  // record says as much — Faraday's replica "passed after numeric revision".
  // Asking for the same pass before the answer is what closes the gap between
  // prose that reads right and prose that measures right.
  const bands = measured.length
    ? `\n\nA checker measures what you write against the contract below. In words:\n${measured
        .map((line) => `- ${line}`)
        .join("\n")}\nMeasure your draft against that list before you answer, and revise it until it fits.`
    : "";
  return `Write in the voice of "${detail.name}".

What follows is its VOICE.md, the contract for this voice from the Katagami writing commons. Read the Never list, match how the gold-standard samples move, and keep inside the measured bands. Write only the piece I ask you for, and keep the contract out of it — no preamble about the voice, no mention of these instructions.${source}${bands}

--- VOICE.md ---
${detail.voiceMd.trim()}
--- end VOICE.md ---`;
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
