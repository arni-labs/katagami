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
  const hero =
    referenceUrls[0] || thumbnailUrl || visibleProofs[0] || "";
  const gallery = (
    visibleProofs.length ? visibleProofs : referenceUrls.slice(1)
  ).filter((src) => src && src !== hero);
  return { hero, gallery };
}
