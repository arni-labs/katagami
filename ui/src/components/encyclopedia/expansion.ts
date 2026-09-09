import type { EncyclopediaCell, MapName } from "@/lib/encyclopedia";
import type { GraphIndex } from "@/lib/encyclopedia-graph";

// What is open on the map. Expansion and zoom are two different controls:
// expansion decides which cells are on the paper at all, zoom decides how much
// of each one is drawn. Nothing here reads the camera.
//
// The map starts with each category node open on its first group of top-level
// cells. Opening a cell puts its first group of narrower cells on the paper;
// asking for more adds the next group; folding a cell takes its whole branch
// off again. A folded branch remembers what was open under it, so opening it
// again shows what the reader had before rather than starting over.

/** How many cells one act of opening reveals. */
export const BATCH = 10;

/** The key a category node goes by in the expansion state. A category is not
 *  a cell, so the key must be one no cell can have: a cell id begins with a
 *  letter or a digit (the schema's id pattern), and this begins with `#`. */
const HUB_PREFIX = "#map:";
export function hubKey(map: MapName): string {
  return `${HUB_PREFIX}${map}`;
}
export function isHubKey(key: string): boolean {
  return key.startsWith(HUB_PREFIX);
}
export function hubMap(key: string): MapName {
  return key.slice(HUB_PREFIX.length) as MapName;
}

export interface Expansion {
  /** Nodes — category keys and cell ids — whose children are on the paper. */
  open: ReadonlySet<string>;
  /** How many children an open node shows. Absent means the first group. */
  shown: ReadonlyMap<string, number>;
}

export function initialExpansion(maps: MapName[]): Expansion {
  return { open: new Set(maps.map(hubKey)), shown: new Map() };
}

export function shownCount(state: Expansion, key: string): number {
  return state.shown.get(key) ?? BATCH;
}

export function toggle(state: Expansion, key: string): Expansion {
  const open = new Set(state.open);
  if (open.has(key)) {
    open.delete(key);
    // Folding a node also forgets how far it had been paged: opening it
    // again starts from the first group, which is the one worth seeing.
    const shown = new Map(state.shown);
    shown.delete(key);
    return { open, shown };
  }
  open.add(key);
  return { open, shown: state.shown };
}

export function showMore(state: Expansion, key: string): Expansion {
  const shown = new Map(state.shown);
  shown.set(key, shownCount(state, key) + BATCH);
  const open = state.open.has(key) ? state.open : new Set(state.open).add(key);
  return { open, shown };
}

/** The children a node has and the order it opens them in. */
export function childrenOf(index: GraphIndex, key: string): EncyclopediaCell[] {
  if (isHubKey(key)) return index.rootsOn(hubMap(key));
  return index.orderedChildren(key);
}

export interface Visible {
  /** Every cell on the paper. */
  cells: Set<string>;
  /** For each open node, the children it is showing, in order. */
  shown: Map<string, EncyclopediaCell[]>;
  /** For each node on the paper, how many of its children are not shown. */
  hidden: Map<string, number>;
}

/** Which cells the expansion state puts on the paper. Walks down from the
 *  category nodes, so a cell is on the paper only when the chain above it is
 *  open — and a cell with two parents is on the paper when either is. The
 *  walk visits each cell once, so a containment cycle in the data cannot
 *  make it run away. */
export function computeVisible(index: GraphIndex, maps: MapName[], state: Expansion): Visible {
  const cells = new Set<string>();
  const shown = new Map<string, EncyclopediaCell[]>();
  const hidden = new Map<string, number>();
  const queue: string[] = [];
  const reveal = (key: string) => {
    const kids = childrenOf(index, key);
    if (!state.open.has(key)) { hidden.set(key, kids.length); return; }
    // A cell with two open parents is shown under the first that reveals it
    // and left out of the second's list, so the second reserves no ring slot
    // for a cell that is drawn elsewhere. The page is taken over the cells
    // this node still has to show, so a cell shown elsewhere neither spends
    // a slot nor counts as hidden.
    const own = kids.filter((kid) => !cells.has(kid.id));
    const list = own.slice(0, shownCount(state, key));
    hidden.set(key, own.length - list.length);
    shown.set(key, list);
    for (const kid of list) {
      cells.add(kid.id);
      queue.push(kid.id);
    }
  };
  for (const map of maps) reveal(hubKey(map));
  while (queue.length) reveal(queue.shift()!);
  return { cells, shown, hidden };
}

/** Open whatever has to be open for a cell to be on the paper: its map's
 *  category, then each cell down the chain, each paged far enough to include
 *  the next. Used when the reader reaches a cell by search, by URL, or from
 *  the phone browser — a cell you asked for must be there when you arrive. */
export function revealPath(index: GraphIndex, state: Expansion, id: string): Expansion {
  const chain = index.ancestry(id);
  if (!chain.length) return state;
  const open = new Set(state.open);
  const shown = new Map(state.shown);
  const cover = (key: string, list: EncyclopediaCell[], child: string) => {
    open.add(key);
    const at = list.findIndex((c) => c.id === child);
    if (at < 0) return;
    const need = Math.ceil((at + 1) / BATCH) * BATCH;
    if (need > (shown.get(key) ?? BATCH)) shown.set(key, need);
  };
  const root = chain[0];
  const map = index.primaryMap(root);
  cover(hubKey(map), index.rootsOn(map), root.id);
  for (let i = 1; i < chain.length; i++) cover(chain[i - 1].id, index.orderedChildren(chain[i - 1].id), chain[i].id);
  return { open, shown };
}
