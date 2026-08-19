/** Unique, non-empty image URLs for a language card, landing first. */
export function thumbnailPreviewSources(
  ...urls: Array<string | undefined>
): string[] {
  const out: string[] = [];
  for (const raw of urls) {
    const url = (raw ?? "").trim();
    if (url && !out.includes(url)) out.push(url);
  }
  return out;
}
