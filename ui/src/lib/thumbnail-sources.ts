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
 * after OData (`[dead, dead]` → `[dead, good]`). A key change is not a full
 * remount — see alignThumbnailPreviewState.
 */
export function thumbnailSourcesKey(sources: readonly string[]): string {
  return JSON.stringify(sources);
}

function sourcesFromKey(key: string): string[] {
  if (!key) return [];
  try {
    const parsed = JSON.parse(key);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Reset failed/srcIndex/loaded only when the identity that matters changes:
 *  a new first URL, or a same-landing replace of an exhausted/failed set.
 *  An array that grew while [0] is the same loaded URL is not a remount. */
export function thumbnailSourcesNeedReset(
  sources: readonly string[],
  state: ThumbnailPreviewSourceState,
): boolean {
  const sourcesKey = thumbnailSourcesKey(sources);
  if (state.sourcesKey === sourcesKey) return false;
  const prevFirst = sourcesFromKey(state.sourcesKey)[0] ?? "";
  const first = sources[0] ?? "";
  if (prevFirst !== first) return true;
  return state.failed;
}

export function alignThumbnailPreviewState(
  sources: readonly string[],
  state: ThumbnailPreviewSourceState,
): ThumbnailPreviewSourceState & { src: string } {
  const sourcesKey = thumbnailSourcesKey(sources);
  if (thumbnailSourcesNeedReset(sources, state)) {
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
    sourcesKey,
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
