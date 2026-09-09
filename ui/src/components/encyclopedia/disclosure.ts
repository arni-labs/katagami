import type {
  EncyclopediaCell,
  MapName,
  ManifestationRecord,
} from "@/lib/encyclopedia";
import { GraphIndex, MAP_NAMES_ORDER } from "@/lib/encyclopedia-graph";
import { plateBox, type GraphLayout, type PlateNode } from "./graph-layout";
import { cellFaces } from "./material";

export const BRANCH_PAGE = 8;
export interface CategoryNode {
  map: MapName;
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  entries: EncyclopediaCell[];
  shown: number;
  preview: EncyclopediaCell | undefined;
  rootIds: string[];
  example?: ManifestationRecord;
}
export function branchChildren(
  index: GraphIndex,
  id: string,
): EncyclopediaCell[] {
  const children = [
    ...index.childrenOf(id),
    ...index
      .neighbours(id)
      .filter((n) => n.via !== "broader")
      .map((n) => n.cell),
  ];
  return [
    ...new Map(
      children.filter((c) => c.id !== id).map((c) => [c.id, c]),
    ).values(),
  ];
}
/** Every component has an entry, including a component whose parents form a cycle. */
export function categoryEntries(
  index: GraphIndex,
  map: MapName,
): EncyclopediaCell[] {
  const members = [...index.byId.values()].filter((c) =>
    c.maps.some((m) => m.map === map),
  );
  const entries = members.filter(
    (c) =>
      !index.parentsOf(c.id).some((p) => p.maps.some((m) => m.map === map)),
  );
  const reached = new Set<string>();
  const visit = (start: EncyclopediaCell) => {
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const c = queue[i];
      if (reached.has(c.id)) continue;
      reached.add(c.id);
      queue.push(
        ...index
          .childrenOf(c.id)
          .filter((k) => k.maps.some((m) => m.map === map)),
      );
    }
  };
  entries.forEach(visit);
  for (const c of members)
    if (!reached.has(c.id)) {
      entries.push(c);
      visit(c);
    }
  return entries.sort(
    (a, b) =>
      index.childrenOf(b.id).length - index.childrenOf(a.id).length ||
      a.name.localeCompare(b.name),
  );
}
export function explorationBox(cell: EncyclopediaCell, expanded: boolean) {
  return expanded
    ? plateBox(cell)
    : { w: 232, h: cellFaces(cell)[0].kind === "name" ? 116 : 210 };
}
/** Geometry depends only on explicit disclosure, never on the camera's zoom. */
export function disclosureLayout(
  index: GraphIndex,
  categories: Map<MapName, number>,
  expanded: Map<string, number>,
  pinned: Set<string>,
): GraphLayout & { categories: CategoryNode[] } {
  const plates: PlateNode[] = [],
    hubs: CategoryNode[] = [];
  const placed = new Set<string>();
  let categoryX = 0;
  for (const map of MAP_NAMES_ORDER) {
    const members = [...index.byId.values()].filter((c) =>
      c.maps.some((m) => m.map === map),
    );
    if (!members.length) continue;
    const entries = categoryEntries(index, map);
    const limit = categories.get(map) ?? 0;
    const roots = entries.slice(0, limit);
    for (const id of pinned) {
      const c = index.byId.get(id);
      if (
        c &&
        c.maps.some((m) => m.map === map) &&
        !roots.some((r) => r.id === id)
      )
        roots.push(c);
    }
    let row = 0,
      right = categoryX + 280;
    function place(cell: EncyclopediaCell, depth: number) {
      if (placed.has(cell.id)) return;
      placed.add(cell.id);
      const box = explorationBox(cell, expanded.has(cell.id));
      const x = categoryX + 470 + depth * 420;
      const start = row;
      const children = branchChildren(index, cell.id).slice(
        0,
        expanded.get(cell.id) ?? 0,
      );
      for (const child of children) place(child, depth + 1);
      row = Math.max(row, start + box.h + 92);
      const y = (start + row - 92) / 2;
      plates.push({
        kind: "plate",
        id: cell.id,
        cell,
        x,
        y,
        w: box.w,
        h: box.h,
        level: depth,
        scale: 1,
      });
      right = Math.max(right, x + box.w / 2);
    }
    roots.forEach((c) => place(c, 0));
    const categoryPlates = plates.filter((p) => p.x >= categoryX);
    const centre = row ? (row - 92) / 2 : 0;
    for (const p of categoryPlates) p.y -= centre;
    hubs.push({
      map,
      x: categoryX + 140,
      y: 0,
      w: 280,
      h: 230,
      count: members.length,
      entries,
      shown: Math.min(limit, entries.length),
      rootIds: roots.map((c) => c.id),
      example:
        members
          .flatMap((c) => c.manifestations)
          .map((m) => m.record)
          .find(
            (r) =>
              r &&
              r.set ===
                {
                  art: "ArtStyles",
                  writing: "WritingStyles",
                  palettes: "PaletteSystems",
                  design: "DesignLanguages",
                }[map] &&
              (r.image || r.excerpt || r.swatches?.length),
          ) ?? undefined,
      preview: members.find((c) =>
        c.studies.some((s) => s.representations.length),
      ),
    });
    categoryX = right + (roots.length ? 220 : 100);
  }
  const regions = hubs.map((h) => {
    const nodes = plates.filter((p) =>
      p.cell.maps.some((m) => m.map === h.map),
    );
    const x = Math.min(h.x - h.w / 2, ...nodes.map((p) => p.x - p.w / 2)),
      top = Math.min(-h.h / 2, ...nodes.map((p) => p.y - p.h / 2));
    const bottom = Math.max(h.h / 2, ...nodes.map((p) => p.y + p.h / 2 + 70));
    const right = Math.max(h.x + h.w / 2, ...nodes.map((p) => p.x + p.w / 2));
    return {
      map: h.map,
      x,
      y: top,
      w: right - x,
      h: bottom - top,
      count: h.count,
    };
  });
  const x = Math.min(0, ...regions.map((r) => r.x)),
    y = Math.min(-115, ...regions.map((r) => r.y));
  const bounds = {
    x,
    y,
    w: Math.max(280, ...regions.map((r) => r.x + r.w)) - x,
    h: Math.max(115, ...regions.map((r) => r.y + r.h)) - y,
  };
  const topBounds = {
    x: 0,
    y: -115,
    w: Math.max(280, ...hubs.map((h) => h.x + 140)),
    h: 230,
  };
  return {
    plates,
    satellites: [],
    categories: hubs,
    regions,
    byId: new Map(plates.map((p) => [p.id, p])),
    bounds,
    topBounds,
    topCentre: { x: topBounds.w / 2, y: 0 },
  };
}
