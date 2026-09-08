import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadAllWritingStyles, loadEncyclopedia, writingStyleCellIndex } from "@/lib/encyclopedia";
import { toWritingStyleSpecimen } from "@/lib/writing-styles";
import { LabHeader } from "@/components/encyclopedia/lab-header";
import { WritingB } from "@/components/writing/writing-b";

// Unlisted and owner-only, like the voice lane it is meant to replace.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Writing styles · index — Katagami lab",
  robots: { index: false, follow: false },
};

export default async function WritingIndexPage() {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const [rows, graph] = await Promise.all([loadAllWritingStyles(), loadEncyclopedia()]);
  const cellIndex = writingStyleCellIndex(graph);
  const specimens = rows
    .map((row) => toWritingStyleSpecimen(row, cellIndex.get(row.entity_id) ?? []))
    .sort((a, b) => a.name.localeCompare(b.name));
  const passages = specimens.reduce((n, s) => n + s.exemplars.length, 0);
  const claimed = specimens.filter((s) => s.cells.length).length;
  return (
    <div className="mx-auto w-full max-w-7xl px-4">
      <LabHeader
        eyebrow="Writing styles · variation B · index"
        ink="var(--sakura)"
        title="Writing"
        marker="styles"
        markerColor="sakura"
        description="A specimen index. Scan every style in one column; read the chosen one in full beside it, every passage and the whole contract. Pin one and pick another to compare."
        variants={[
          { href: "/lab/writing/a", label: "A · passages", active: false },
          { href: "/lab/writing/b", label: "B · index", active: true },
        ]}
        stats={[
          { value: specimens.length, label: "styles" },
          { value: passages, label: "passages" },
          { value: claimed, label: "in the encyclopedia" },
        ]}
      />
      <WritingB specimens={specimens} />
    </div>
  );
}
