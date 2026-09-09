import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadEncyclopedia } from "@/lib/encyclopedia";
import { EncyclopediaMap } from "@/components/encyclopedia/encyclopedia-map";
import { settledLayout } from "@/lib/encyclopedia-layout";

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
  const graph = await loadEncyclopedia();
  // The field is settled here, not in the browser, and once per state of the
  // library rather than once per request. Running it during the client's first
  // render froze the page for about four seconds before anything appeared.
  const layout = settledLayout(graph);
  return (
    <>
      <EncyclopediaMap graph={graph} layout={layout} initialCellId={initialCellId} />
      {graph.withheld ? (
        <p className="mx-auto max-w-7xl px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {graph.withheld} {graph.withheld === 1 ? "cell is" : "cells are"} withheld: not attested under the current contract.
        </p>
      ) : null}
    </>
  );
}
