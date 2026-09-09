import type { EncyclopediaCell, EncyclopediaGraph, MapName } from "@/lib/encyclopedia";

// Pure graph helpers for the encyclopedia map (client-safe).
// The hierarchy is `broader` (parent → child). Lateral distance is `relations`.

export type RelationInk = "ramune" | "sakura" | "yuzu";

export interface Edge {
  from: string;
  to: string;
  kind: "broader" | "relation";
  label: string;
  explanation: string;
  sourceIds: string[];
}

export interface Neighbour {
  cell: EncyclopediaCell;
  /** How the neighbour is reached: the relation label, "broader", or "narrower". */
  via: string;
  explanation: string;
}

export interface FarJump {
  cell: EncyclopediaCell;
  hops: number;
  path: string[];
}

/** One drawn line between two cells, carrying every relation stated between
 *  them in either direction (A "influenced" B and B "influenced by" A are one
 *  line with two entries). */
export interface RelationLine {
  key: string;
  a: string;
  b: string;
  ink: RelationInk;
  entries: Edge[];
}

export class GraphIndex {
  readonly byId: Map<string, EncyclopediaCell>;
  readonly children: Map<string, EncyclopediaCell[]>;
  readonly edges: Edge[];
  readonly roots: EncyclopediaCell[];
  readonly relationLines: RelationLine[];
  private readonly adjacency: Map<string, Set<string>>;

  constructor(readonly graph: EncyclopediaGraph) {
    this.byId = new Map(graph.cells.map((cell) => [cell.id, cell]));
    this.children = new Map();
    this.adjacency = new Map(graph.cells.map((cell) => [cell.id, new Set<string>()]));
    this.edges = [];
    for (const cell of graph.cells) {
      for (const link of cell.broader) {
        if (!this.byId.has(link.cellId)) continue;
        const list = this.children.get(link.cellId) ?? [];
        list.push(cell);
        this.children.set(link.cellId, list);
        this.edges.push({ from: link.cellId, to: cell.id, kind: "broader", label: "broader", explanation: link.explanation, sourceIds: link.sourceIds });
        this.adjacency.get(cell.id)!.add(link.cellId);
        this.adjacency.get(link.cellId)!.add(cell.id);
      }
      for (const relation of cell.relations) {
        if (!this.byId.has(relation.cellId)) continue;
        this.edges.push({ from: cell.id, to: relation.cellId, kind: "relation", label: relation.label, explanation: relation.explanation, sourceIds: relation.sourceIds });
        this.adjacency.get(cell.id)!.add(relation.cellId);
        this.adjacency.get(relation.cellId)!.add(cell.id);
      }
    }
    for (const list of this.children.values()) list.sort((a, b) => a.name.localeCompare(b.name));
    const lines = new Map<string, RelationLine>();
    for (const edge of this.edges) {
      if (edge.kind !== "relation") continue;
      const [a, b] = [edge.from, edge.to].sort();
      const key = `${a}|${b}`;
      const line = lines.get(key) ?? { key, a, b, ink: relationInk(edge.label), entries: [] };
      line.entries.push(edge);
      // Opposition wins the line's ink if any entry states it; then influence.
      const inks = line.entries.map((e) => relationInk(e.label));
      line.ink = inks.includes("sakura") ? "sakura" : inks.includes("ramune") ? "ramune" : "yuzu";
      lines.set(key, line);
    }
    this.relationLines = [...lines.values()];
    // A root is a cell none of whose broader cells is in the library. A broader
    // pointer to a cell that is not here is shown on the sheet, not hidden.
    this.roots = graph.cells.filter((cell) => !cell.broader.some((link) => this.byId.has(link.cellId)));
  }

  childrenOf(id: string): EncyclopediaCell[] {
    return this.children.get(id) ?? [];
  }

  parentsOf(id: string): EncyclopediaCell[] {
    const cell = this.byId.get(id);
    if (!cell) return [];
    return cell.broader.map((link) => this.byId.get(link.cellId)).filter((c): c is EncyclopediaCell => Boolean(c));
  }

  /** The cell's first map, used to place it on the top layer. */
  primaryMap(cell: EncyclopediaCell): MapName {
    return cell.maps[0]?.map ?? "art";
  }

  /** Every descendant, without repeats (a cell may have several parents). */
  descendants(id: string): EncyclopediaCell[] {
    const out: EncyclopediaCell[] = [];
    const seen = new Set<string>([id]);
    const queue = [...this.childrenOf(id)];
    while (queue.length) {
      const next = queue.shift()!;
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      out.push(next);
      queue.push(...this.childrenOf(next.id));
    }
    return out;
  }

  /** One-hop neighbours with how they connect, parents and children first. */
  neighbours(id: string): Neighbour[] {
    const cell = this.byId.get(id);
    if (!cell) return [];
    const out: Neighbour[] = [];
    const seen = new Set<string>();
    for (const link of cell.broader) {
      const target = this.byId.get(link.cellId);
      if (target && !seen.has(target.id)) { seen.add(target.id); out.push({ cell: target, via: "broader", explanation: link.explanation }); }
    }
    for (const kid of this.childrenOf(id)) {
      if (seen.has(kid.id)) continue;
      seen.add(kid.id);
      const link = kid.broader.find((b) => b.cellId === id);
      out.push({ cell: kid, via: "narrower", explanation: link?.explanation ?? "" });
    }
    for (const relation of cell.relations) {
      const target = this.byId.get(relation.cellId);
      if (target && !seen.has(target.id)) { seen.add(target.id); out.push({ cell: target, via: relation.label, explanation: relation.explanation }); }
    }
    for (const edge of this.edges) {
      if (edge.kind !== "relation" || edge.to !== id) continue;
      const source = this.byId.get(edge.from);
      if (source && !seen.has(source.id)) { seen.add(source.id); out.push({ cell: source, via: edge.label, explanation: edge.explanation }); }
    }
    return out;
  }

  /** Hop distances from a cell over every edge, undirected. */
  distances(id: string): Map<string, { hops: number; prev: string | null }> {
    const dist = new Map<string, { hops: number; prev: string | null }>();
    if (!this.byId.has(id)) return dist;
    dist.set(id, { hops: 0, prev: null });
    const queue = [id];
    while (queue.length) {
      const current = queue.shift()!;
      const d = dist.get(current)!.hops;
      for (const next of this.adjacency.get(current) ?? []) {
        if (dist.has(next)) continue;
        dist.set(next, { hops: d + 1, prev: current });
        queue.push(next);
      }
    }
    return dist;
  }

  /** The reachable cell farthest away, with the path that gets there. Returns
   *  null for an isolated cell — there is nowhere to jump to. */
  farJump(id: string): FarJump | null {
    const dist = this.distances(id);
    let best: { id: string; hops: number } | null = null;
    for (const [other, entry] of dist) {
      if (other === id) continue;
      if (!best || entry.hops > best.hops || (entry.hops === best.hops && other < best.id)) best = { id: other, hops: entry.hops };
    }
    if (!best || best.hops < 2) return null;
    const path: string[] = [];
    let cursor: string | null = best.id;
    while (cursor) { path.unshift(cursor); cursor = dist.get(cursor)!.prev; }
    return { cell: this.byId.get(best.id)!, hops: best.hops, path };
  }

  /** Cells matching a query on name and description, plus a map filter. */
  search(query: string, map: MapName | null): EncyclopediaCell[] {
    const q = query.trim().toLowerCase();
    return this.graph.cells.filter((cell) => {
      if (map && !cell.maps.some((m) => m.map === map)) return false;
      if (!q) return true;
      return cell.name.toLowerCase().includes(q) || cell.description.toLowerCase().includes(q);
    });
  }

  /** The chain of parents from a root down to the cell (first parent each step). */
  ancestry(id: string): EncyclopediaCell[] {
    const chain: EncyclopediaCell[] = [];
    const seen = new Set<string>();
    let cursor = this.byId.get(id);
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      chain.unshift(cursor);
      cursor = this.parentsOf(cursor.id)[0];
    }
    return chain;
  }
}

/** Relation labels draw in the three inks and nothing else. Influence flows
 *  in ramune, opposition in sakura, every other kinship in yuzu. */
export function relationInk(label: string): RelationInk {
  const l = label.toLowerCase();
  if (/react|oppos|against|reject|counter|break/.test(l)) return "sakura";
  if (/influenc|descend|derive|inherit|grew|precursor|inspir|anticipat/.test(l)) return "ramune";
  return "yuzu";
}

export const MAP_NAMES_ORDER: MapName[] = ["art", "writing", "palettes", "design"];

export const MAP_LABEL: Record<MapName, string> = {
  art: "Art",
  writing: "Writing",
  palettes: "Palettes",
  design: "Design",
};

/** Each map's ink. The signature trio carries the chrome — the region title,
 *  the corner wash — and the fourth map prints in plain ink rather than
 *  spending a fourth accent on a heading. */
export const MAP_INK: Record<MapName, string> = {
  art: "var(--sakura)",
  writing: "var(--ramune)",
  palettes: "var(--yuzu)",
  design: "var(--sumi)",
};

export const STATUS_LABEL: Record<string, string> = {
  Draft: "Draft",
  UnderReview: "Under review",
  Published: "Published",
  Archived: "Archived",
  ValidatingDocument: "Validating",
};
