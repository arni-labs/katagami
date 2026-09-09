import "server-only";

import { createHash } from "node:crypto";
import type { EncyclopediaGraph } from "@/lib/encyclopedia";
import { GraphIndex } from "@/lib/encyclopedia-graph";
import { layoutGraph, seedFromLayout, type LayoutSeed } from "@/components/encyclopedia/graph-layout";

// Settling the field is a pure function of the cells and takes seconds over a
// library this size. It runs here, on the server, so the browser never spends
// that time; and because it is pure, the same cells give the same map, so it
// runs once per state of the library rather than once per request. Opening the
// page twice, or two people opening it, costs one layout.

const KEEP = 3;
const settled = new Map<string, LayoutSeed>();

/** Everything the layout reads, hashed. Any change to any cell gives a new
 *  key, so a stale map cannot be served for cells that have moved on. */
function fingerprint(graph: EncyclopediaGraph): string {
  return createHash("sha256").update(JSON.stringify(graph.cells)).digest("hex");
}

export function settledLayout(graph: EncyclopediaGraph): LayoutSeed {
  const key = fingerprint(graph);
  const already = settled.get(key);
  if (already) {
    // Refresh its place in the order so the map in use is the last evicted.
    settled.delete(key);
    settled.set(key, already);
    return already;
  }
  const seed = seedFromLayout(layoutGraph(new GraphIndex(graph)));
  settled.set(key, seed);
  while (settled.size > KEEP) settled.delete(settled.keys().next().value as string);
  return seed;
}
