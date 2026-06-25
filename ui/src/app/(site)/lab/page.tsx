import { listBakeoffModels, listBakeoffRounds } from "@/lib/bakeoff";
import { BakeoffIndex } from "./bakeoff-index";

// Unlisted on purpose — not added to header-nav, mobile-nav, or the search
// index. Reachable only by URL. Mirrors /model-bake-off.

export const dynamic = "force-dynamic";

export default async function LabIndex() {
  const [rounds, models] = await Promise.all([
    listBakeoffRounds(),
    listBakeoffModels(),
  ]);
  return <BakeoffIndex rounds={rounds} models={models} />;
}
