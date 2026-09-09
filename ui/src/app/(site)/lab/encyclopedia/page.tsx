import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadEncyclopedia } from "@/lib/encyclopedia";
import { EncyclopediaMap } from "@/components/encyclopedia/encyclopedia-map";

// Unlisted and owner-only: the encyclopedia is for owners and curators until
// a published projection exists. Not in nav, not in search, not indexed.
// Gating is isOwner(); in a development build KATAGAMI_LAB_PREVIEW=1 opens the
// page for local review and a production build never reads it.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Encyclopedia — Katagami lab",
  robots: { index: false, follow: false },
};

export default async function EncyclopediaPage({ searchParams }: { searchParams: Promise<{ cell?: string | string[] }> }) {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const { cell } = await searchParams;
  const initialCellId = typeof cell === "string" ? cell : null;
  const graph = await loadEncyclopedia();
  return (
    <>
      <EncyclopediaMap graph={graph} initialCellId={initialCellId} />
      {graph.withheld ? (
        <p className="mx-auto max-w-7xl px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {graph.withheld} {graph.withheld === 1 ? "cell is" : "cells are"} withheld: not attested under the current contract.
        </p>
      ) : null}
    </>
  );
}
