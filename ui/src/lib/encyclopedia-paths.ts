// Which routes are served from the held encyclopedia read.
//
// Its own module so it can be exercised directly: it decides whether a write
// announced to /api/revalidate reaches the library those pages share, and a
// path missing from it means a curator's write is invisible for up to a
// minute on every page in the list.

/** Route prefixes whose content comes from the held encyclopedia read. */
export const ENCYCLOPEDIA_ROUTES = ["/encyclopedia", "/writing", "/voice"];

/** Whether this path renders cells. A prefix test on path segments, so
 *  "/writing/some-style" counts and "/writings" does not. */
export function readsTheEncyclopedia(path: string): boolean {
  return ENCYCLOPEDIA_ROUTES.some((base) => path === base || path.startsWith(`${base}/`));
}
