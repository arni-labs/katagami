import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadEncyclopedia } from "@/lib/encyclopedia";
import { GraphIndex } from "@/lib/encyclopedia-graph";
import { LabHeader } from "@/components/encyclopedia/lab-header";
import { FieldB } from "@/components/encyclopedia/field-b";

// Unlisted and owner-only: the encyclopedia is for owners and curators until
// a published projection exists. Not in nav, not in search, not indexed.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Encyclopedia · drawers — Katagami lab",
  robots: { index: false, follow: false },
};

export default async function EncyclopediaDrawersPage({ searchParams }: { searchParams: Promise<{ cell?: string | string[] }> }) {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const { cell } = await searchParams;
  const initialCellId = typeof cell === "string" ? cell : null;
  const graph = await loadEncyclopedia();
  const index = new GraphIndex(graph);
  const relations = index.edges.filter((edge) => edge.kind === "relation").length;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16">
      <LabHeader
        eyebrow="Encyclopedia · variation B · the drawers"
        ink="var(--sakura)"
        title="The"
        marker="encyclopedia"
        markerColor="sakura"
        description="Sheets inside sheets. Each map is a drawer of top-level cells; each cell is a sheet holding its narrower cells. You enter a cell instead of expanding it, and the breadcrumb is how deep you are."
        variants={[
          { href: "/lab/encyclopedia/a", label: "A · field", active: false },
          { href: "/lab/encyclopedia/b", label: "B · drawers", active: true },
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
      <div className="mt-6">
        <FieldB graph={graph} initialCellId={initialCellId} />
      </div>
    </div>
  );
}
