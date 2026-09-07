import type { EncyclopediaCell, EncyclopediaMap } from "./encyclopedia-schema.ts";

export type GraphDiagnostic =
  | { kind: "missing-cell"; cellId: string; targetId: string; relationship: string }
  | { kind: "containment-cycle"; cellId: string; targetId: string };

export type CellGraph = {
  cells: Map<string, EncyclopediaCell>;
  children: Map<string, string[]>;
  diagnostics: GraphDiagnostic[];
};

export function buildCellGraph(entries: EncyclopediaCell[]): CellGraph {
  const cells = new Map<string, EncyclopediaCell>();
  const children = new Map<string, string[]>();
  const diagnostics: GraphDiagnostic[] = [];
  for (const cell of entries) {
    if (cells.has(cell.id)) throw new Error(`Duplicate cell identifier: ${cell.id}`);
    cells.set(cell.id, cell);
    children.set(cell.id, []);
  }
  for (const cell of entries) {
    for (const parent of cell.document.broader) {
      const siblings = children.get(parent.cellId);
      if (siblings) siblings.push(cell.id);
      else diagnostics.push({ kind: "missing-cell", cellId: cell.id, targetId: parent.cellId, relationship: "broader" });
    }
    for (const relation of cell.document.relations) {
      if (!cells.has(relation.cellId)) {
        diagnostics.push({ kind: "missing-cell", cellId: cell.id, targetId: relation.cellId, relationship: relation.label });
      }
    }
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => (cells.get(a)?.document.name ?? a).localeCompare(cells.get(b)?.document.name ?? b));
  }

  // Iterative traversal avoids a JavaScript call-stack limit becoming a depth rule.
  const completed = new Set<string>();
  for (const start of cells.keys()) {
    if (completed.has(start)) continue;
    const active = new Set<string>();
    const stack = [{ id: start, leaving: false }];
    while (stack.length) {
      const step = stack.pop();
      if (!step) break;
      if (step.leaving) {
        active.delete(step.id);
        completed.add(step.id);
        continue;
      }
      if (completed.has(step.id)) continue;
      active.add(step.id);
      stack.push({ id: step.id, leaving: true });
      for (const child of children.get(step.id) ?? []) {
        if (active.has(child)) {
          diagnostics.push({ kind: "containment-cycle", cellId: step.id, targetId: child });
        } else if (!completed.has(child)) {
          stack.push({ id: child, leaving: false });
        }
      }
    }
  }
  return { cells, children, diagnostics };
}

export function descendantIds(graph: CellGraph, cellId: string): string[] {
  const seen = new Set([cellId]);
  const result: string[] = [];
  const pending = [...(graph.children.get(cellId) ?? [])].reverse();
  while (pending.length) {
    const id = pending.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    pending.push(...[...(graph.children.get(id) ?? [])].reverse());
  }
  return result;
}

export function mapEntryPoints(graph: CellGraph, map: EncyclopediaMap): string[] {
  const inMap = [...graph.cells.values()].filter((cell) => cell.document.maps.includes(map))
    .sort((a, b) => a.document.name.localeCompare(b.document.name));
  const ids = new Set(inMap.map((cell) => cell.id));
  const roots = inMap.filter((cell) => !cell.document.broader.some((parent) => ids.has(parent.cellId)))
    .map((cell) => cell.id);
  const covered = new Set(roots.flatMap((id) => [id, ...descendantIds(graph, id)]));
  for (const cell of inMap) {
    if (covered.has(cell.id)) continue;
    roots.push(cell.id);
    covered.add(cell.id);
    for (const descendant of descendantIds(graph, cell.id)) covered.add(descendant);
  }
  return roots;
}
