import "server-only";

import { getNarrativeStructure, listNarrativeStructures } from "@/lib/odata";
import {
  narrativeStructureFixture,
  toNarrativeStructure,
  type NarrativeStructure,
} from "@/lib/narrative-structures";

export type NarrativeStructureDataSource = "temper" | "fixture";

export interface NarrativeStructureCollection {
  structures: NarrativeStructure[];
  source: NarrativeStructureDataSource;
}

export async function loadNarrativeStructures(): Promise<NarrativeStructureCollection> {
  let rows;
  try {
    rows = await listNarrativeStructures();
  } catch {
    return { structures: narrativeStructureFixture, source: "fixture" };
  }
  if (rows.length === 0) return { structures: narrativeStructureFixture, source: "fixture" };
  return {
    structures: rows.map(toNarrativeStructure).sort((left, right) => left.name.localeCompare(right.name)),
    source: "temper",
  };
}

export async function loadNarrativeStructure(
  id: string,
): Promise<{ structure: NarrativeStructure; source: NarrativeStructureDataSource } | null> {
  let row;
  try {
    row = await getNarrativeStructure(id);
  } catch {
    const structure = narrativeStructureFixture.find((candidate) => candidate.id === id);
    return structure ? { structure, source: "fixture" } : null;
  }
  return { structure: toNarrativeStructure(row), source: "temper" };
}
