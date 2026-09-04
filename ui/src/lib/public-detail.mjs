// Shared visibility decision for language / art-style (and palette) detail
// doors. A miss, unpublished (non-curator), or published-but-off-shelf row
// must notFound() — returning generic metadata instead is HTTP 200 chrome
// (~97k / ~100k, title `katagami ✦ language`) rather than a real 404.

/**
 * Should this resolved row stay hidden from the current viewer?
 * `row` is null on a ByIdOrSlug miss. Cookie-backed flags are optional so a
 * featured Published render never has to read them:
 *   - unpublished → only `curatorAccess` matters
 *   - published → `onShelf` first; `fullAccess` only when off-shelf
 *
 * @param {{ status?: string } | null | undefined} row
 * @param {{ onShelf?: boolean, fullAccess?: boolean, curatorAccess?: boolean }} flags
 */
export function publicDetailHidden(row, flags = {}) {
  if (!row) return true;
  if (row.status !== "Published") return !flags.curatorAccess;
  if (flags.onShelf) return false;
  return !flags.fullAccess;
}

/**
 * Resolve a detail row the way the page doors do: ByIdOrSlug, then gate the
 * resolved entity_id. Returns the row or null (caller notFound()s). Injected
 * deps so the contract test can render this function without Next/Temper.
 *
 * @template T
 * @param {string} idOrSlug
 * @param {{
 *   getByIdOrSlug: (id: string) => Promise<T | null | undefined>,
 *   maySee: (entityId: string) => Promise<boolean>,
 *   hasFullAccess: () => Promise<boolean>,
 *   hasCurator: () => Promise<boolean>,
 * }} deps
 * @returns {Promise<T | null>}
 */
export async function resolvePublicDetail(idOrSlug, deps) {
  const row = await deps.getByIdOrSlug(idOrSlug);
  if (!row) return null;
  if (row.status !== "Published") {
    return (await deps.hasCurator()) ? row : null;
  }
  if (await deps.maySee(row.entity_id)) return row;
  return (await deps.hasFullAccess()) ? row : null;
}
