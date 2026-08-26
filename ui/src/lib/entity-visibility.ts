import "server-only";
import { NextResponse } from "next/server";
import { hasCuratorAccess } from "@/lib/owner";
import { getUser, isAuthConfigured } from "@/lib/user-auth";
import {
  listFeaturedArtStyles,
  listFeaturedDesignLanguages,
} from "@/lib/odata";

// ARN-331: by-id readers must not serve non-Published entities to the public.
// Route handlers that export derived artifacts (DESIGN.md, shadcn.*, BRIEF.md)
// call artifactGate() before rendering.
//
// ARN-385: Published is not enough. The HTML language/art-style detail pages
// further restrict anonymous visitors to the owner-picked featured shelf. The
// raw artifact URLs used to skip that check (Published → 200), so a search
// hit or a guessed id leaked the full spec. Featured membership — not the
// row's own flag — is the source of truth, matching the visitor shelf.
// Featured Published stays CDN-cacheable (no cookie). A signed-in viewer of
// a Published-but-unfeatured language gets a private response so the 200 can
// never land in a shared cache for an anonymous replay.

const PUBLIC_CACHE = "public, max-age=60, s-maxage=300";
const OWNER_CACHE = "private, no-store";

export type ArtifactKind = "language" | "art_style";

export type ArtifactGate =
  | { allowed: true; cacheControl: string }
  | { allowed: false; response: NextResponse };

function denied(): ArtifactGate {
  return {
    allowed: false,
    response: new NextResponse("not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  };
}

/** Is this id on the anonymous visitor shelf for its kind? */
export async function isOnVisitorShelf(
  kind: ArtifactKind,
  id: string,
): Promise<boolean> {
  if (kind === "language") {
    const featured = await listFeaturedDesignLanguages();
    return featured.some((l) => l.entity_id === id);
  }
  const featured = await listFeaturedArtStyles();
  return featured.some((a) => a.entity_id === id);
}

export async function artifactGate(
  status: string | undefined,
  entity: { id: string; kind: ArtifactKind },
): Promise<ArtifactGate> {
  if (status === "Published") {
    // Featured first, no cookie: keeps the public shelf CDN-cacheable.
    if (await isOnVisitorShelf(entity.kind, entity.id)) {
      return { allowed: true, cacheControl: PUBLIC_CACHE };
    }
    // Off the shelf: only a signed-in viewer, and never a shared cache.
    if (await hasFullGalleryAccess()) {
      return { allowed: true, cacheControl: OWNER_CACHE };
    }
    return denied();
  }
  if (await hasCuratorAccess()) {
    // Curator/owner preview of a draft: the role lookup makes the request
    // dynamic, and the response must never land in a shared cache.
    return { allowed: true, cacheControl: OWNER_CACHE };
  }
  return denied();
}

/** Page-level variant: may this viewer see a non-Published entity at all? */
export async function canViewNonPublished(): Promise<boolean> {
  return hasCuratorAccess();
}

/**
 * ARN-385: does this viewer get the full language gallery (vs the signed-out
 * owner-picked featured shelf)? Anyone signed in does. When sign-in isn't
 * configured (local dev, self-hosters without Google OAuth) the gallery stays
 * fully open — a teaser whose "Sign in" door doesn't exist would lock the
 * catalog for everyone.
 */
export async function hasFullGalleryAccess(): Promise<boolean> {
  if (!isAuthConfigured()) return true;
  return (await getUser()) !== null;
}
