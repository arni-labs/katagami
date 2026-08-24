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

export type ThumbnailPreviewSourceState = {
  sourcesKey: string;
  failed: boolean;
  loaded: boolean;
  srcIndex: number;
};

/**
 * Identity of the whole src list. First URL + length is not enough: a reused
 * card can keep the same landing URL and count while later fallbacks change
 * after OData (`[dead, dead]` → `[dead, good]`).
 */
export function thumbnailSourcesKey(sources: readonly string[]): string {
  return JSON.stringify(sources);
}

export function alignThumbnailPreviewState(
  sources: readonly string[],
  state: ThumbnailPreviewSourceState,
): ThumbnailPreviewSourceState & { src: string } {
  const sourcesKey = thumbnailSourcesKey(sources);
  if (state.sourcesKey !== sourcesKey) {
    return {
      sourcesKey,
      failed: false,
      loaded: false,
      srcIndex: 0,
      src: sources[0] ?? "",
    };
  }
  return {
    ...state,
    src: sources[state.srcIndex] ?? "",
  };
}

export function advanceThumbnailPreviewState(
  sources: readonly string[],
  state: ThumbnailPreviewSourceState,
): ThumbnailPreviewSourceState & { src: string } {
  const aligned = alignThumbnailPreviewState(sources, state);
  if (aligned.srcIndex + 1 < sources.length) {
    const srcIndex = aligned.srcIndex + 1;
    return {
      sourcesKey: aligned.sourcesKey,
      failed: false,
      loaded: false,
      srcIndex,
      src: sources[srcIndex] ?? "",
    };
  }
  return {
    sourcesKey: aligned.sourcesKey,
    failed: true,
    loaded: false,
    srcIndex: aligned.srcIndex,
    src: sources[aligned.srcIndex] ?? "",
  };
}
