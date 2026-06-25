import { listBakeoffModels, listBakeoffRounds } from "@/lib/bakeoff";
import { BakeoffIndex } from "../lab/bakeoff-index";

// The published model bake-off — the rounds index. Unlisted on purpose;
// reachable at /model-bake-off. Each round is a Direction (a reimagine brief)
// with its submitted Katagami languages.

// ISR: serve the assembled rounds index from the edge cache, revalidating in the
// background. It was force-dynamic, re-scanning the catalog on every open (slow).
export const revalidate = 60;

export const metadata = {
  title: "Model Bake Off — Katagami",
  description:
    "Blind comparison: guess which model reimagined each Katagami design language.",
};

export default async function ModelBakeOffPage() {
  const [rounds, models] = await Promise.all([
    listBakeoffRounds(),
    listBakeoffModels(),
  ]);
  return <BakeoffIndex rounds={rounds} models={models} />;
}
