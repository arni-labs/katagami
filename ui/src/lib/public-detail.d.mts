/** True when the detail door must notFound() for this viewer. */
export function publicDetailHidden(
  row: { status?: string } | null | undefined,
  flags?: {
    onShelf?: boolean;
    fullAccess?: boolean;
    curatorAccess?: boolean;
  },
): boolean;

type DetailRow = { status?: string; entity_id: string };

/** ByIdOrSlug + entity_id gate. Null means the page must notFound(). */
export function resolvePublicDetail<T extends DetailRow>(
  idOrSlug: string,
  deps: {
    getByIdOrSlug: (id: string) => Promise<T | null | undefined>;
    maySee: (entityId: string) => Promise<boolean>;
    hasFullAccess: () => Promise<boolean>;
    hasCurator: () => Promise<boolean>;
  },
): Promise<T | null>;
