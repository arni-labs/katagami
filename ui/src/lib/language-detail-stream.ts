/**
 * When a language-detail Suspense island may paint a pulse.
 *
 * `render`  — the island will produce UI. Pulse is legal.
 * `pending` — catalogs are in flight and have not resolved empty. Pulse
 *             is legal from language fields (landing+dashboard). The page
 *             must not await them. This replay is separate from [] / throw.
 * `empty`   — no landing/dashboard: do not mount (page-dark). Resolved
 *             `[]` / throw is also empty: dark. That rendered island must
 *             not contain two h-72. A sibling LanguageSectionSkeleton
 *             hidden later with :has is leftover — replay 2 still painted
 *             the pulse. Wrapping the catalog fetch in fallback={skeleton}
 *             is also leftover — a thrown list would pulse first.
 * `unknown` — page fields cannot tell. A pulse would collapse. No pulse.
 *
 * Remix: landing+dashboard (same filter as toLanguageOpts) is known before
 * Suspense. Omitted catalogs = pending, not empty. `{ palettes: [], arts: [] }`
 * is empty — including listArtStyles / listPaletteSystems catch-to-`[]`.
 * Missing landing/dashboard is empty (do not mount).
 *
 * Catalogs and the pending pulse belong to the remix page slot so first
 * paint is not held on route `loading.tsx`. Pending pulse and empty/throw
 * dark cannot share one page Suspense fallback. Omitted catalogs: pulse
 * fallback. `[]` / throw: no pulse in the fallback and none in the
 * resolved tree — dark from the first paint. A page-level remix
 * `fallback={null}` on the pending path is leftover (2). Awaiting
 * catalogs on LanguageDetailPage is leftover (1).
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

export type RemixIslandPaint = "dark" | "pulse" | "lane";

/** Page first paint: mount the island only when remix is not page-empty. */
export function remixPageMountsIsland(outcome: StreamOutcome): boolean {
  return outcome !== "empty";
}

/**
 * Paint inside a mounted remix island.
 * Pending pulses. Render is the lane. Resolved empty is dark.
 * Unmounted (no landing) is dark.
 */
export function remixIslandPaint(
  outcome: StreamOutcome,
  mounted: boolean,
): RemixIslandPaint {
  if (!mounted) return "dark";
  if (outcome === "render") return "lane";
  if (outcome === "pending") return "pulse";
  return "dark";
}

/**
 * Whether LanguageSectionSkeleton may ever paint on this outcome.
 * Pending / render: yes (in-flight from language fields, then lane).
 * Empty / throw: no — that result path is a separate replay and must
 * not have shown two h-72. Do not fold pending→empty into one journey.
 */
export function remixIslandEverSkeleton(
  outcome: StreamOutcome,
  mounted: boolean,
): boolean {
  if (!mounted) return false;
  return outcome === "pending" || outcome === "render";
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
 * Catch-to-`[]` helper. The island treats this resolved empty as dark,
 * not as a forever `LanguageSectionSkeleton`.
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

/**
 * Page remix Suspense fallback. Pending (catalogs omitted) may pulse.
 * Empty / throw must not — that replay cannot share the pending fallback.
 */
export function remixPageFallback(
  lang: LangRow,
  catalogs?: RemixCatalogs,
): "pulse" | null {
  return remixStreamOutcome(lang, catalogs) === "empty" ? null : "pulse";
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
