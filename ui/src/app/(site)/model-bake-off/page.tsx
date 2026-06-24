import { notFound } from "next/navigation";
import { getComparison } from "../lab/comparisons";
import { LabComparison } from "../lab/lab-comparison";

// The published model bake-off — the latest final run (round 13, with the no-rules variant).
// Unlisted on purpose; reachable at /model-bake-off.

export const dynamic = "force-static";

export const metadata = {
  title: "Model Bake Off — Katagami",
  description:
    "Blind comparison: guess which model made each Kodomo no Hi design. Twelve models, with rules and without.",
};

export default function ModelBakeOffPage() {
  const comparison = getComparison("kodomo-no-hi-13");
  if (!comparison) notFound();
  return <LabComparison comparison={comparison} />;
}
