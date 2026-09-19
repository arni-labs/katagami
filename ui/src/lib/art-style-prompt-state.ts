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
  // Proofs compare models on matched source content. A curated example set
  // demonstrates the style across subjects and owns the visible gallery.
  const gallery = [...new Set(
    examples.length > 1 ? examples.slice(1) : visibleProofs,
  )].filter((src) => src && src !== hero);
  return { hero, gallery };
}
