import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadEncyclopedia } from "@/lib/encyclopedia";
import { GraphIndex } from "@/lib/encyclopedia-graph";
import { LabHeader } from "@/components/encyclopedia/lab-header";
import { FieldA } from "@/components/encyclopedia/field-a";

// Unlisted and owner-only: the encyclopedia is for owners and curators until
// a published projection exists. Not in nav, not in search, not indexed.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Encyclopedia · field — Katagami lab",
  robots: { index: false, follow: false },
};

export default async function EncyclopediaFieldPage({ searchParams }: { searchParams: Promise<{ cell?: string | string[] }> }) {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const { cell } = await searchParams;
  const initialCellId = typeof cell === "string" ? cell : null;
  const graph = await loadEncyclopedia();
  const index = new GraphIndex(graph);
  const relations = index.edges.filter((edge) => edge.kind === "relation").length;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16">
      <LabHeader
        eyebrow="Encyclopedia · variation A · the field"
        ink="var(--sakura)"
        title="The"
        marker="encyclopedia"
        markerColor="sakura"
        description="One plane. The top layer is the cells with nothing broader above them, grouped by map. Open a cell and its narrower cells fan out around it; zoom in and each one becomes a specimen."
        variants={[
          { href: "/lab/encyclopedia/a", label: "A · field", active: true },
          { href: "/lab/encyclopedia/b", label: "B · drawers", active: false },
        ]}
        stats={[
          { value: graph.cells.length, label: "cells" },
          { value: index.roots.length, label: "top level" },
          { value: relations, label: "relations" },
        ]}
      />
      {graph.withheld ? (
        <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          {graph.withheld} {graph.withheld === 1 ? "cell is" : "cells are"} withheld: not attested under the current contract.
        </p>
      ) : null}
      <div className="mt-8">
        <FieldA graph={graph} initialCellId={initialCellId} />
      </div>
    </div>
  );
}
