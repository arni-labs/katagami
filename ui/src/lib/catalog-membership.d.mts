/** True when this published row is the given entity id or slug. */
export function rowMatchesIdOrSlug(
  row: {
    entity_id?: string;
    fields?: Record<string, unknown> | null;
  } | null | undefined,
  idOrSlug: string,
): boolean;
