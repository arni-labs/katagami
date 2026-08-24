/**
 * When a language-detail Suspense island may paint a pulse.
 *
 * `render` — the island will produce UI. A #245 / DetailPulseShell pulse is legal.
 * `empty` — the island will return null. Do not mount it (no pulse, no fetch).
 * `unknown` — still waiting on a catalog. A pulse would collapse if the
 * island then returns null; fallback={null} is required.
 *
 * Remix: missing landing/dashboard is known before Suspense (same filter as
 * toLanguageOpts). Empty listArtStyles / listPaletteSystems is only known
 * after those calls — treat that as empty, never as a successful pulse.
 */

type FieldBag = Record<string, string | undefined>;
type LangRow = { entity_id: string; status: string; fields: FieldBag };

export type StreamOutcome = "render" | "empty" | "unknown";

export function streamShowsPulse(outcome: StreamOutcome): boolean {
  return outcome === "render";
}

function parseJson<T = unknown>(raw?: unknown): T | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw as T;
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return null;
  }
}

/** Same gate as toLanguageOpts: both compositions must exist. */
export function languageHasRemixComposition(lang: LangRow): boolean {
  return (
    Boolean(lang.fields.landing_file_id) && Boolean(lang.fields.dashboard_file_id)
  );
}

/** Same emptiness as toPaletteOpts / toArtOpts (all palettes; arts need a prompt). */
export function canRemixLanguage(
  lang: LangRow,
  paletteRows: LangRow[],
  artRows: LangRow[],
): boolean {
  return (
    languageHasRemixComposition(lang) &&
    paletteRows.length > 0 &&
    artRows.some((a) => Boolean((a.fields.prompt_template ?? "").trim()))
  );
}

/** `catalogs` omitted = listArtStyles / listPaletteSystems still pending. */
export function remixStreamOutcome(
  lang: LangRow,
  catalogs?: { palettes: LangRow[]; arts: LangRow[] },
): StreamOutcome {
  if (!languageHasRemixComposition(lang)) return "empty";
  if (!catalogs) return "unknown";
  return canRemixLanguage(lang, catalogs.palettes, catalogs.arts)
    ? "render"
    : "empty";
}

function identityArtPointer(fields: FieldBag): boolean {
  if (fields.default_art_style_id) return true;
  const imagery =
    parseJson<{ pairs_with?: string }>(fields.imagery_direction) ?? {};
  return Boolean(imagery.pairs_with?.trim());
}

/** Same signature rule LanguageIdentity uses for the applied-token fallback. */
function identityAppliedSignature(fields: FieldBag): boolean {
  const colors =
    parseJson<{ colors?: Record<string, string> }>(fields.tokens)?.colors ?? {};
  const isHex = (c?: string): c is string =>
    typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c);
  return [colors.primary, colors.accent, colors.secondary].some(isHex);
}

export function identityStreamOutcome(fields: FieldBag): StreamOutcome {
  if (identityAppliedSignature(fields)) return "render";
  if (identityArtPointer(fields) || fields.default_palette_id) return "unknown";
  return "empty";
}

export function lineageStreamOutcome(): StreamOutcome {
  // Children need a published-catalog scan. Declared parent_ids may all be
  // unpublished (ARN-331) — the section still returns null.
  return "unknown";
}

export function relatedStreamOutcome(): StreamOutcome {
  // Taste neighbours and tag-overlap both resolve after fetch; either can
  // be empty. A pulse would collapse on a language with no peers.
  return "unknown";
}
