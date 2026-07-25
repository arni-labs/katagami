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
