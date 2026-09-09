// How an OData listing walks its pages. Pure, and deliberately in its own
// module with no server-only import, so the rules below can be tested directly
// rather than only through a live backend.

/** The next page to read, or null when the listing is done.
 *
 *  Three things this has to get right, each of which has bitten a reader here:
 *
 *  - The backend returns `@odata.nextLink` relative to the request URI
 *    ("EncyclopediaCells?$skiptoken=…"), so it is resolved against the page
 *    just read, not treated as an absolute URL.
 *  - A present-but-unusable nextLink is a fault, not the end of the listing.
 *    Treating it as the end silently truncates the collection, which is how a
 *    hundred rows once went missing without anything failing.
 *  - A nextLink that points somewhere else entirely is refused. Following it
 *    would send the tenant's bearer token to another origin. */
export function resolveNextLink(link: unknown, current: string, apiBase: string): string | null {
  if (link === undefined || link === null) return null;
  if (typeof link !== "string" || link === "") {
    throw new Error("The listing returned a nextLink that is not a usable URL");
  }
  const resolved = new URL(link, current);
  if (resolved.origin !== new URL(apiBase).origin) {
    throw new Error(`Refusing cross-origin nextLink: ${link}`);
  }
  return resolved.toString();
}

/** How many pages a listing may walk before we call it a runaway. */
export const MAX_PAGES = 50;

/** Guards against a listing that never ends: too many pages, or a nextLink
 *  that sends the reader back somewhere it has already been. */
export function checkPageCursor(next: string, seen: Set<string>, pages: number, what: string): void {
  if (pages > MAX_PAGES) throw new Error(`${what}: pagination exceeded ${MAX_PAGES} pages`);
  if (seen.has(next)) throw new Error(`${what}: pagination looped on a repeated nextLink`);
}
