import { listBakeoffRounds } from "@/lib/bakeoff";
import { BakeoffIndex } from "../lab/bakeoff-index";

// The published model bake-off — the rounds index. Unlisted on purpose;
// reachable at /model-bake-off. Each round is a Direction (a reimagine brief)
// with its submitted Katagami languages.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Model Bake Off — Katagami",
  description:
    "Blind comparison: guess which model reimagined each Katagami design language.",
};

export default async function ModelBakeOffPage() {
  const rounds = await listBakeoffRounds();
  return <BakeoffIndex rounds={rounds} />;
}
