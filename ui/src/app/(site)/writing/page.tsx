import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import { loadAllWritingStyles, loadEncyclopedia, writingStyleCellIndex } from "@/lib/encyclopedia";
import { toWritingStyleSpecimen } from "@/lib/writing-styles";
import { LabHeader } from "@/components/encyclopedia/lab-header";
import { WritingA } from "@/components/writing/writing-a";

// Owner-only, like the voice lane it succeeds: a plain 404 for anyone else,
// and the nav link appears only after the client-side owner check.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Writing styles — Katagami",
  robots: { index: false, follow: false },
};

export default async function WritingPassagesPage() {
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
        eyebrow="Writing styles"
        ink="var(--sakura)"
        title="Writing"
        marker="styles"
        markerColor="sakura"
        description="The passage comes first. Every card opens on a real exemplar from the record, quoted with its credit; the name, persona and contract follow. Shortlist a few and compare them side by side."
        stats={[
          { value: specimens.length, label: "styles" },
          { value: passages, label: "passages" },
          { value: claimed, label: "in the encyclopedia" },
        ]}
      />
      <WritingA specimens={specimens} />
    </div>
  );
}
