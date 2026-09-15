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
  // Parsing sits inside its own guard per row, not around the whole map. Every
  // record is a Draft and the schema requires two exemplars, so one half-saved
  // structure threw for the entire page and /structure answered 500 — the list
  // of 31 good records is the useful answer, not an error.
  const structures = [];
  for (const row of rows) {
    try {
      structures.push(toNarrativeStructure(row));
    } catch {
      continue;
    }
  }
  if (structures.length === 0) return { structures: narrativeStructureFixture, source: "fixture" };
  return {
    structures: structures.sort((left, right) => left.name.localeCompare(right.name)),
    source: "temper",
  };
}

export async function loadNarrativeStructure(
  id: string,
): Promise<{ structure: NarrativeStructure; source: NarrativeStructureDataSource } | null> {
  const fromFixture = () => {
    const structure = narrativeStructureFixture.find((candidate) => candidate.id === id);
    return structure ? { structure, source: "fixture" as const } : null;
  };
  let row;
  try {
    row = await getNarrativeStructure(id);
  } catch (error) {
    if (!/OData 404\b/.test(String(error))) return fromFixture();
    // A 404 on a keyed read is ambiguous: the record is gone, or the entity set
    // is not installed and OData 404s either way. Round one collapsed the two,
    // which meant an uninstalled set served 32 fixture cards on /structure whose
    // every link then 404'd. Ask the collection which case this is: if it
    // answers, the set exists and this record really is absent; if it also
    // fails, Temper cannot serve the lane and the fixture is right.
    try {
      await listNarrativeStructures();
    } catch {
      return fromFixture();
    }
    return null;
  }
  try {
    return { structure: toNarrativeStructure(row), source: "temper" };
  } catch {
    // The row exists but is half-saved. Showing the fixture would present stale
    // content as the live record, so the page reports it as missing instead.
    return null;
  }
}
