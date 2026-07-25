export type ArtStylePromptState =
  | "verified"
  | "published-legacy"
  | "owner-review";

export function artStylePromptState(
  status: string | undefined,
  promptVerified: boolean,
): ArtStylePromptState {
  if (promptVerified) return "verified";
  return status === "Published" ? "published-legacy" : "owner-review";
}

export function artStylePromptLabel(state: ArtStylePromptState): string {
  if (state === "verified") return "Canonical aesthetic prompt";
  if (state === "published-legacy") return "Published legacy prompt";
  return "Draft prompt · owner review";
}

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
