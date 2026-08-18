/** /language/[id] 404s for visitors on anything but Published. Bake-off
 *  still shows those cards; this is the only link that must stay off. */
export function canLinkBakeoffLanguage(
  status: string | undefined,
  viewerCanOpenUnpublished: boolean,
): boolean {
  return status === "Published" || viewerCanOpenUnpublished;
}
