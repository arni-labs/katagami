/**
 * Language-detail remix paints. Catalogs stay off LanguageDetailPage
 * (hero / spec / embodiments do not await listPaletteSystems / listArtStyles).
 *
 * pending — landing+dashboard, catalogs omitted (in flight). Pulse is legal.
 * empty   — no landing+dashboard, or catalogs `[]` / throw (catch-to-`[]`).
 *           Dark. Must never have painted two h-72, then collapsed.
 * render  — catalogs in hand and canRemixLanguage.
 *
 * The live page mounts LanguageDetailRemix (lang only) and does not wrap
 * that fetch in the pending pulse. Wrapping it is leftover: [] / throw
 * rides the pulse and flashes two h-72 then gone. Tests render both
 * paints of the page tree (pending helper + live slot + resolved []).
 */

type FieldBag = Record<string, string | undefined>;
export type LangRow = { entity_id: string; status: string; fields: FieldBag };

export type StreamOutcome = "render" | "pending" | "empty";
export type RemixPagePaint = "dark" | "pulse" | "lane";
export type RemixCatalogs = { palettes: LangRow[]; arts: LangRow[] };

/** Same gate as toLanguageOpts: both compositions must exist. */
export function languageHasRemixComposition(lang: LangRow): boolean {
  return (
    Boolean(lang.fields.landing_file_id) && Boolean(lang.fields.dashboard_file_id)
  );
}

/** Same emptiness as toPaletteOpts / toArtOpts (arts need a prompt). */
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

export async function resolveRemixCatalogs(
  listPalettes: () => Promise<LangRow[]>,
  listArts: () => Promise<LangRow[]>,
): Promise<RemixCatalogs> {
  const [palettes, arts] = await Promise.all([
    listPalettes().catch(() => []),
    listArts().catch(() => []),
  ]);
  return { palettes, arts };
}

/**
 * `catalogs` omitted = lists still pending. That is not `{ palettes: [], arts: [] }`.
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

/** First paint of the page remix tree. Pending pulses. Empty / throw is dark. */
export function remixPageFirstPaint(
  lang: LangRow,
  catalogs?: RemixCatalogs,
): RemixPagePaint {
  const outcome = remixStreamOutcome(lang, catalogs);
  if (outcome === "empty") return "dark";
  if (outcome === "pending") return "pulse";
  return "lane";
}
