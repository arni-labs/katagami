import { notFound } from "next/navigation";
import { listBakeoffModels, listBakeoffRounds } from "@/lib/bakeoff";
import { isOwner } from "@/lib/owner";
import { BakeoffIndex } from "./bakeoff-index";

// OWNER-ONLY: live rounds show work in progress, including rejected and
// unfinished submissions. The public, curated bake-off lives at
// /model-bake-off. (Previously merely unlisted; that still leaked results
// to anyone with the URL.)

export const dynamic = "force-dynamic";

export default async function LabIndex() {
  if (!(await isOwner())) notFound();
  const [rounds, models] = await Promise.all([
    listBakeoffRounds(),
    listBakeoffModels(),
  ]);
  return <BakeoffIndex rounds={rounds} models={models} />;
}
