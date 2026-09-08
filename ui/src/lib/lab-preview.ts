import "server-only";

// The /lab encyclopedia and writing pages are owner-only (the encyclopedia
// visibility rule: raw cells are for owners and curators). Owner mode is a
// signed-in Google identity whose Member.role is owner, and that sign-in path
// needs a real OAuth client plus the authorization-server key — neither exists
// in a local dev checkout. This flag opens ONLY these lab pages for local
// review: it is read exclusively in development builds, so a production build
// compiles it away and the gate there is isOwner() alone.
export function labPreviewAllowed(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.KATAGAMI_LAB_PREVIEW === "1"
  );
}
