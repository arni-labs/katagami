export function artStyleGallerySources({
  status,
  promptVerified,
  referenceUrls,
  proofUrls,
  thumbnailUrl,
}: {
  status: string | undefined;
  promptVerified: boolean;
  referenceUrls: string[];
  proofUrls: string[];
  thumbnailUrl: string;
}): { hero: string; gallery: string[] } {
  // Published legacy records keep their existing gallery. Private review
  // records do not present obsolete proofs from an earlier test contract.
  const visibleProofs =
    promptVerified || status === "Published" ? proofUrls : [];
  const examples = [...new Set(referenceUrls.filter(Boolean))];
  const hero =
    examples[0] || thumbnailUrl || visibleProofs[0] || "";
  // Examples and matched-source model comparisons are both useful to readers.
  const gallery = [...new Set([...examples.slice(1), ...visibleProofs])]
    .filter((src) => src && src !== hero);
  return { hero, gallery };
}

/** The images an art style's own page shows, as addresses an image tool can
 *  fetch: hero first, then the gallery, each on the file proxy when the
 *  page's CDN copy has one (a CDN copy can 404; the proxy is the source),
 *  absolute, at most `limit`. */
export function artStyleReferenceUrls(
  sources: { hero: string; gallery: string[] },
  fallbacks: Record<string, string>,
  origin: string,
  limit = 12,
): string[] {
  const out: string[] = [];
  for (const url of [sources.hero, ...sources.gallery]) {
    if (!url) continue;
    const source = fallbacks[url] || url;
    const absolute = source.startsWith("/") ? `${origin}${source}` : source;
    if (!out.includes(absolute)) out.push(absolute);
    if (out.length === limit) break;
  }
  return out;
}
