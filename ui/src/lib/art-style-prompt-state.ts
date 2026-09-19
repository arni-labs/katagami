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
