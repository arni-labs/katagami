const MANIFESTATION_CATEGORIES = [
  "human_portrait",
  "nonhuman_living",
  "still_life_object",
  "landscape_environment",
] as const;

type ProofManifest = {
  items?: Array<{ file_id?: string; category?: string }>;
  presentation?: {
    schema_version?: string;
    hero_file_id?: string;
    items?: Array<{
      file_id?: string;
      category?: string;
      selection_reason?: string;
    }>;
  };
};

function parseManifest(raw?: string): ProofManifest | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Pick the four public manifestations without exposing the duplicate
 * cross-model audit row. New records carry an explicit editorial selection.
 * Legacy records fall back to one proof per semantic category.
 */
export function artStyleManifestationFileIds({
  proofManifest,
  proofFileIds,
  thumbnailFileId,
}: {
  proofManifest?: string;
  proofFileIds: string[];
  thumbnailFileId: string;
}): string[] {
  const manifest = parseManifest(proofManifest);
  const proofSet = new Set(proofFileIds);
  const proofCategory = new Map(
    (manifest?.items ?? [])
      .filter((item): item is { file_id: string; category: string } =>
        Boolean(item.file_id && item.category),
      )
      .map((item) => [item.file_id, item.category]),
  );

  const explicit = manifest?.presentation?.items ?? [];
  const explicitCategories = new Set(explicit.map((item) => item.category));
  if (
    manifest?.presentation?.schema_version === "1" &&
    explicit.length === MANIFESTATION_CATEGORIES.length &&
    explicitCategories.size === MANIFESTATION_CATEGORIES.length &&
    MANIFESTATION_CATEGORIES.every((category) => explicitCategories.has(category)) &&
    explicit.every(
      (item) =>
        Boolean(item.file_id) &&
        proofSet.has(item.file_id!) &&
        proofCategory.get(item.file_id!) === item.category,
    )
  ) {
    return explicit.map((item) => item.file_id!);
  }

  const byCategory = new Map<string, string>();
  for (const item of manifest?.items ?? []) {
    if (
      item.file_id &&
      item.category &&
      proofSet.has(item.file_id) &&
      !byCategory.has(item.category)
    ) {
      byCategory.set(item.category, item.file_id);
    }
  }
  const thumbnailCategory = proofCategory.get(thumbnailFileId);
  if (thumbnailCategory && proofSet.has(thumbnailFileId)) {
    byCategory.set(thumbnailCategory, thumbnailFileId);
  }

  const categorized = MANIFESTATION_CATEGORIES.map((category) =>
    byCategory.get(category),
  ).filter((id): id is string => Boolean(id));
  if (categorized.length) return categorized;

  // Very old records predate semantic categories. Preserve a compact gallery
  // while still avoiding an eight-cell audit dump.
  const legacy = [
    ...(proofSet.has(thumbnailFileId) ? [thumbnailFileId] : []),
    ...proofFileIds,
  ];
  return [...new Set(legacy)].slice(0, MANIFESTATION_CATEGORIES.length);
}

export function artStyleGallerySources({
  status,
  promptVerified,
  referenceUrls,
  manifestationUrls,
  thumbnailUrl,
}: {
  status: string | undefined;
  promptVerified: boolean;
  referenceUrls: string[];
  manifestationUrls: string[];
  thumbnailUrl: string;
}): { hero: string; gallery: string[] } {
  // Audit proofs remain evidence. The public/owner-preview gallery gets only
  // the four editorial manifestations, never both model rows.
  const visibleManifestations =
    promptVerified || status === "Published" ? manifestationUrls : [];
  // The canonical prompt and its selected manifestations are the backbone.
  // Optional references are supplementary examples and never displace the
  // curator-selected hero or suppress subject-role coverage.
  const hero = thumbnailUrl || visibleManifestations[0] || referenceUrls[0] || "";
  const gallerySource = [...visibleManifestations, ...referenceUrls];
  const gallery = gallerySource.filter((src) => src && src !== hero);
  return { hero, gallery };
}
