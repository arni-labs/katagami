/** Canonical public origin for gallery + DESIGN.md links. */
export function siteBaseFromRequest(request: Request): string {
  const configured = (
    process.env.KATAGAMI_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    ""
  ).replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}
