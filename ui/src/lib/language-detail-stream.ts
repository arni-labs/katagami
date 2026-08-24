/**
 * When a language-detail Suspense island may paint a pulse.
 *
 * `render`  — the island will produce UI. Pulse is legal.
 * `pending` — the language already qualifies; catalogs are not here yet. Pulse is legal.
 * `empty`   — the island will return null. Do not mount it (no pulse).
 * `unknown` — page fields cannot tell. A pulse would collapse. No pulse.
 *
 * Remix: landing+dashboard (same filter as toLanguageOpts) is known before
 * Suspense. Omitted catalogs = pending, not empty. `{ palettes: [], arts: [] }`
 * is empty — including listArtStyles / listPaletteSystems catch-to-`[]`.
 * Missing landing/dashboard is empty (do not mount).
 *
 * The language page must await `resolveRemixCatalogs` *before* choosing the
 * remix Suspense fallback. Omitted catalogs on that page would pulse, then
 * the island's catch-to-`[]` would collapse the lane. While that await is
 * in flight, `loading.tsx` (`LanguageDetailSkeleton`) is the Bluet pulse.
 *
 * Lineage / related: no field on this page proves they will render.
 * parent_ids may be unpublished (ARN-331); children and neighbours need a
 * catalog that can be empty. Those islands keep fallback={null} — that
 * leftover is not closed by a constant-unknown gate.
 */

type FieldBag = Record<string, string | undefined>;
type LangRow = { entity_id: string; status: string; fields: FieldBag };

export type StreamOutcome = "render" | "pending" | "empty" | "unknown";

export function streamShowsPulse(outcome: StreamOutcome): boolean {
  return outcome === "render" || outcome === "pending";
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

export type RemixCatalogs = { palettes: LangRow[]; arts: LangRow[] };
export type RemixCatalogLoader = () => Promise<LangRow[]>;

/**
 * `listArtStyles` / `listPaletteSystems` catch to `[]`. That empty result
 * has to be known before a remix pulse paints, or Bluet-class pages
 * pulse then collapse. Call this outside the remix Suspense.
 */
export async function resolveRemixCatalogs(
  listPalettes: RemixCatalogLoader,
  listArts: RemixCatalogLoader,
): Promise<RemixCatalogs> {
  const [palettes, arts] = await Promise.all([
    listPalettes().catch(() => []),
    listArts().catch(() => []),
  ]);
  return { palettes, arts };
}

/**
 * `catalogs` omitted = listArtStyles / listPaletteSystems still pending.
 * That is not the same as passing empty arrays.
 */
export function remixStreamOutcome(
  lang: LangRow,
  catalogs?: RemixCatalogs,
): StreamOutcome {
  if (!languageHasRemixComposition(lang)) return "empty";
  if (!catalogs) return "pending";
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
