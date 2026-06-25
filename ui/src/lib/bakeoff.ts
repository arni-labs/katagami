// Live bake-off rounds, built from backend Directions + their submitted
// languages. A bake-off ROUND is a Direction with is_bakeoff=true; its entries
// are every DesignLanguage whose `direction_id` points at it (across statuses —
// submissions sit UnderReview until a curator publishes the keepers). Each entry
// is mapped into the `LabComparison` shape the existing game UI renders, so the
// quiz/score/details experience is identical — only the data source changed,
// from a static manifest to the live commons.

import {
  listDirections,
  getDirection,
  listDesignLanguages,
  getDesignLanguage,
  getFileUrl,
  parseJson,
  type DesignLanguage,
  type Direction,
} from "./odata";
import type {
  LabComparison,
  LabModel,
  LabView,
} from "@/app/(site)/lab/comparisons";

const VIEW_ORDER: LabView[] = ["landing", "dashboard", "embodiment", "immersive"];

// Raw provenance model id -> display name. Extend as new models enter the pool;
// anything unknown is title-cased so it still reads sensibly.
const MODEL_DISPLAY: Record<string, string> = {
  opus: "Opus 4.8",
  "opus-4.8": "Opus 4.8",
  sonnet: "Sonnet 4.6",
  haiku: "Haiku 4.5",
  gpt: "GPT-5.5",
  "gpt-5": "GPT-5.5",
  grok: "Grok",
  "grok-4.3": "Grok 4.3",
  "grok-build": "Grok Build",
  fugu: "Fugu",
  "fugu-ultra": "Fugu Ultra",
  composer: "Composer 2.5",
  kimi: "Kimi K2.7",
  "kimi-k2.7": "Kimi K2.7",
  glm: "GLM 5.2",
  "glm-5.2": "GLM 5.2",
  minimax: "MiniMax M3",
  "minimax-m3": "MiniMax M3",
  deepseek: "DeepSeek V4 Pro",
  "deepseek-v4": "DeepSeek V4 Pro",
  qwen37: "Qwen 3.7",
  "qwen3.7-max": "Qwen 3.7 Max",
  "qwen36-or": "Qwen 3.6",
  "qwen3.6-35b": "Qwen 3.6",
};

function titleCase(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function modelDisplay(raw?: string): string {
  if (!raw || !raw.trim()) return "Unknown model";
  const k = raw.trim();
  return MODEL_DISPLAY[k] ?? MODEL_DISPLAY[k.toLowerCase()] ?? titleCase(k);
}

interface Metrics {
  thinking_tokens?: number; // fresh_input + output (the model's real work, excl. cache)
  total_tokens?: number; // fresh + cache_read + cache_write + output — what cost_usd is computed over
  cost_usd?: number; // realistic API list price, cache-aware
  wall_seconds?: number; // harness start -> exit
  billing?: string;
  source?: string;
}

interface Provenance {
  style?: { model?: string };
  source?: { model?: string };
  images?: { model?: string; provider?: string; tool?: string };
  metrics?: Metrics;
}

// metrics live inline in model_provenance (METRICS-CONTRACT.md): the run total is
// carried by the DesignLanguage — do NOT sum the three entities.
function fmtTokens(n?: number): string | undefined {
  if (!n || n <= 0) return undefined;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}
function fmtCost(usd?: number): string | undefined {
  if (usd == null || usd < 0) return undefined;
  return `$${usd.toFixed(2)}`;
}
function fmtWall(seconds?: number): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${String(rem).padStart(2, "0")}s` : `${rem}s`;
}

function provenanceOf(
  fields: Record<string, string | undefined>,
): Provenance {
  // model_provenance arrives as a JSON string OR an already-parsed object,
  // depending on how it was submitted — parseJson handles both.
  return parseJson<Provenance>(fields.model_provenance) ?? {};
}

// The model the quiz asks you to guess: the model that authored the language
// (model_provenance.style.model is the canonical author per METRICS-CONTRACT.md).
function modelOf(p: Provenance): string {
  return modelDisplay(p.style?.model ?? p.source?.model);
}

// A short image-model label for the reveal line (e.g. "xai/grok-imagine-image"
// -> "grok-imagine").
function imageModelOf(p: Provenance): string | undefined {
  const m = p.images?.model;
  if (!m || !m.trim()) return undefined;
  return m.split("/").pop()?.replace(/-image$/, "")?.trim() || m;
}

function isBakeoff(d: Direction): boolean {
  const v = (d.fields.is_bakeoff ?? "").toString().trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function viewsOf(f: Record<string, string | undefined>): {
  views: LabView[];
  previews: Partial<Record<LabView, string>>;
} {
  const previews: Partial<Record<LabView, string>> = {};
  if (f.landing_file_id) previews.landing = getFileUrl(f.landing_file_id);
  if (f.dashboard_file_id) previews.dashboard = getFileUrl(f.dashboard_file_id);
  if (f.embodiment_file_id)
    previews.embodiment = getFileUrl(f.embodiment_file_id);
  const views = VIEW_ORDER.filter((v) => previews[v]);
  return { views, previews };
}

function toModel(lang: DesignLanguage): LabModel {
  const f = lang.fields as Record<string, string | undefined>;
  const p = provenanceOf(f);
  const { views, previews } = viewsOf(f);
  const m = p.metrics ?? {};
  return {
    name: modelOf(p),
    dir: "",
    views,
    previews,
    imageModel: imageModelOf(p),
    // Reveal stats — populated once the orchestrator backfills metrics; absent
    // until then (StatRow/MetaLine render nothing rather than zeros).
    cost: fmtCost(m.cost_usd),
    // The headline token count sits beside the cost, and cost_usd is computed
    // over ALL tokens — so the number that "lines up with cost" is total_tokens.
    // thinking_tokens (the model's real work, excl. cache) is the secondary note.
    tokens: fmtTokens(m.total_tokens),
    tokensThinking: fmtTokens(m.thinking_tokens),
    wall: fmtWall(m.wall_seconds),
    languageId: lang.entity_id,
    languageName: (f.name || "Untitled").trim(),
    status: lang.status,
  };
}

// A round's LIVE submissions only: UnderReview (in play) + Published (kept).
// Archived = the orchestrator/curator cleaned it up; Draft = not yet submitted.
// Counting Archived would keep a cleaned-up round (all-archived) showing forever.
const LIVE_STATUSES = new Set(["UnderReview", "Published"]);
function isLive(l: DesignLanguage): boolean {
  return LIVE_STATUSES.has(l.status || l.fields.Status || "");
}

// Every live language linked to a round. The dynamic-field server filter works
// today; the client fallback keeps the screen correct if a kernel change ever
// stops honoring it (a filter that silently returns everything would otherwise
// mix rounds together).
async function languagesForRound(id: string): Promise<DesignLanguage[]> {
  let rows: DesignLanguage[] = [];
  try {
    const filtered = await listDesignLanguages(`direction_id eq '${id}'`);
    rows = filtered.filter((l) => (l.fields.direction_id ?? "") === id);
    if (rows.length === 0 && filtered.length === 0) {
      // filter may not have been honored — fall back to a full scan
      rows = (await listDesignLanguages()).filter(
        (l) => (l.fields.direction_id ?? "") === id,
      );
    }
  } catch {
    rows = (await listDesignLanguages()).filter(
      (l) => (l.fields.direction_id ?? "") === id,
    );
  }
  return rows.filter(isLive);
}

export interface BakeoffRoundSummary {
  id: string;
  title: string;
  brief?: string;
  roundLabel?: string;
  sourceId?: string;
  sourceName?: string;
  sourceThumb?: string;
  modelCount: number;
  status: string; // Open / Closed
}

interface SourceInfo {
  name?: string;
  thumb?: string;
}

// The published language a round reimagines: its name + a thumbnail to show it
// (landing screenshot preferred, else the embodiment thumbnail).
async function sourceInfo(sourceId?: string): Promise<SourceInfo> {
  if (!sourceId) return {};
  try {
    const f = (await getDesignLanguage(sourceId)).fields as Record<
      string,
      string | undefined
    >;
    const thumb =
      (f.landing_thumbnail_asset_url || "").trim() ||
      (f.landing_thumbnail_file_id
        ? getFileUrl(f.landing_thumbnail_file_id)
        : "") ||
      (f.thumbnail_asset_url || "").trim() ||
      (f.thumbnail_file_id ? getFileUrl(f.thumbnail_file_id) : "");
    return { name: f.name?.trim() || undefined, thumb: thumb || undefined };
  } catch {
    return {};
  }
}

// The round name is DERIVED from the source language — never the orchestrator's
// hardcoded Direction.title (which has shipped things like "(r2)"). Falls back to
// the stored title (with any trailing "(rN)" stripped) only when there is no
// resolvable source.
function roundTitle(
  sourceName: string | undefined,
  storedTitle: string | undefined,
): string {
  if (sourceName && sourceName.trim()) return `Reimagine ${sourceName.trim()}`;
  const t = (storedTitle || "").replace(/\s*\(r\d+\)\s*$/i, "").trim();
  return t || "Untitled round";
}

/** All bake-off rounds that actually have submissions, newest first. */
export async function listBakeoffRounds(): Promise<BakeoffRoundSummary[]> {
  let dirs: Direction[];
  try {
    dirs = (await listDirections()).filter(isBakeoff);
  } catch {
    return [];
  }
  const summaries = await Promise.all(
    dirs.map(async (d): Promise<BakeoffRoundSummary | null> => {
      const langs = await languagesForRound(d.entity_id);
      if (langs.length === 0) return null; // hide empty/placeholder rounds
      const f = d.fields;
      const src = await sourceInfo(f.source_language_id);
      return {
        id: d.entity_id,
        title: roundTitle(src.name, f.title),
        brief: f.brief,
        roundLabel: f.round_label,
        sourceId: f.source_language_id,
        sourceName: src.name,
        sourceThumb: src.thumb,
        modelCount: langs.length,
        status: d.status,
      };
    }),
  );
  return summaries
    .filter((s): s is BakeoffRoundSummary => s !== null)
    .sort((a, b) => b.id.localeCompare(a.id)); // uuid-v7 ids sort by creation time
}

/** One round, shaped for the game component. null if not a bake-off / no entries. */
export async function getBakeoffRound(id: string): Promise<LabComparison | null> {
  let dir: Direction;
  try {
    dir = await getDirection(id);
  } catch {
    return null;
  }
  if (!isBakeoff(dir)) return null;
  const langs = await languagesForRound(id);
  if (langs.length === 0) return null;

  const f = dir.fields;
  const models: Record<string, LabModel> = {};
  for (const lang of langs) models[lang.entity_id] = toModel(lang);
  // Stable A/B/C label order, by the language's own name.
  const blindOrder = Object.keys(models).sort((a, b) =>
    (models[a].languageName ?? "").localeCompare(models[b].languageName ?? ""),
  );
  // Union of available views across the round, in canonical order.
  const present = new Set<LabView>();
  for (const k of blindOrder)
    (models[k].views ?? []).forEach((v) => present.add(v));
  const views = VIEW_ORDER.filter((v) => present.has(v));
  const src = await sourceInfo(f.source_language_id);

  return {
    slug: id,
    tag: (f.round_label || "").toUpperCase(),
    title: roundTitle(src.name, f.title),
    eyebrow: "",
    blurb: "",
    prompt: f.brief,
    sourceId: f.source_language_id,
    sourceName: src.name,
    sourceThumb: src.thumb,
    views: views.length ? views : ["landing"],
    blindOrder,
    models,
    judged: dir.status === "Closed",
  };
}
