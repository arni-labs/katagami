import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadEncyclopediaCached } from "@/lib/encyclopedia-cache";
import { EncyclopediaMap } from "@/components/encyclopedia/encyclopedia-map";

// Owner-only: the encyclopedia is for the owner until a published projection
// exists. Anyone else gets a plain 404, the same pattern as /voice/[id]; the
// nav link appears only after the client-side owner check. Not indexed.
// Gating is isOwner(); in a development build KATAGAMI_LAB_PREVIEW=1 opens the
// page for local review and a production build never reads it.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Encyclopedia — Katagami",
  robots: { index: false, follow: false },
};

export default async function EncyclopediaPage({ searchParams }: { searchParams: Promise<{ cell?: string | string[] }> }) {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const { cell } = await searchParams;
  const initialCellId = typeof cell === "string" ? cell : null;
  const graph = await loadEncyclopediaCached();
  // Disclosure geometry is bounded by the branches the reader explicitly opens.
  return (
    <>
      {/* The withheld count is said inside the page rather than under it: on a
          phone this paragraph sat below the fixed navigation bar and could not
          be read at all. The map's status line carries it on a desktop and the
          browser carries it on a phone — this comment claimed that before
          either of them did, which is how it went missing from the desktop. */}
      <EncyclopediaMap graph={graph} initialCellId={initialCellId} />
    </>
  );
}
