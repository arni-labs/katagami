"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Expand,
  Home,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import type {
  EncyclopediaCell,
  EncyclopediaGraph,
  CellManifestation,
  MapName,
} from "@/lib/encyclopedia";
import {
  GraphIndex,
  MAP_LABEL,
  MAP_NAMES_ORDER,
} from "@/lib/encyclopedia-graph";
import { SheetBody, OpenCellButton, type SheetTab } from "./focus-sheet";
import { useCellFace, brokenOnArrival } from "./map-cards";
import {
  CARD_H,
  CARD_W,
  cameraFor,
  makeGrid,
  visibleTiles,
  type Camera,
  type Tile,
} from "./scene";
import { useMapCamera } from "./use-map-camera";
import "./map.css";

type Scope =
  | { kind: "overview" }
  | { kind: "map"; map: MapName }
  | { kind: "cell"; id: string };
type Entry =
  | { kind: "map"; map: MapName; count: number; names: string[] }
  | { kind: "cell"; cell: EncyclopediaCell }
  | { kind: "record"; manifestation: CellManifestation; ordinal: number };
type Visit = { scope: Scope; camera: Camera };
const MemoSheetBody = memo(SheetBody);
const INK: Record<MapName, string> = {
  art: "var(--ramune)",
  writing: "var(--sakura)",
  palettes: "var(--yuzu)",
  design: "var(--ramune)",
};
const inkStyle = (ink: string): CSSProperties & { "--atlas-ink": string } => ({
  "--atlas-ink": ink,
});
const entryName = (entry: Entry) =>
  entry.kind === "map"
    ? MAP_LABEL[entry.map]
    : entry.kind === "cell"
      ? entry.cell.name
      : (entry.manifestation.record?.name ?? "Record unavailable");
const entryKey = (entry: Entry) =>
  entry.kind === "map"
    ? entry.map
    : entry.kind === "cell"
      ? entry.cell.id
      : entry.manifestation.entityId + ":" + entry.ordinal;

function Specimen({ cell }: { cell: EncyclopediaCell }) {
  const { face, onImageError } = useCellFace(cell);
  return (
    <div className="atlas-specimen">
      {face.kind === "image" ? (
        <img
          src={face.url}
          alt={face.alt}
          loading="lazy"
          draggable={false}
          ref={(img) => brokenOnArrival(img, onImageError)}
          onError={onImageError}
        />
      ) : face.kind === "passage" ? (
        <blockquote>{face.text}</blockquote>
      ) : face.kind === "palette" ? (
        <div className="atlas-swatches">
          {face.swatches.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
      ) : (
        <p className="atlas-scope">{cell.description || face.note}</p>
      )}
      <span className="atlas-caption">{face.caption}</span>
    </div>
  );
}

function RecordCard({
  manifestation: m,
}: {
  manifestation: CellManifestation;
}) {
  const [failed, setFailed] = useState(false);
  const r = m.record;
  return (
    <>
      <span className="atlas-eyebrow">
        {r?.set.replace(/([a-z])([A-Z])/g, "$1 $2") ?? m.entitySet}
      </span>
      <h3>
        {r?.name ??
          (m.unread ? "Record could not be read" : "Record unavailable")}
      </h3>
      {r?.image && !failed ? (
        <img
          className="atlas-record-image"
          src={r.image}
          alt={r.name}
          loading="lazy"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : r?.excerpt ? (
        <blockquote className="atlas-record-excerpt">{r.excerpt}</blockquote>
      ) : r?.swatches?.length ? (
        <div className="atlas-swatches">
          {r.swatches.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
      ) : (
        <p className="atlas-record-excerpt">
          {failed
            ? "The image could not be loaded. Open the record for its available material."
            : r?.line || m.explanation}
        </p>
      )}
      <span className="atlas-card-footer">
        Open record <ArrowUpRight size={17} />
      </span>
    </>
  );
}

export function EncyclopediaMap({
  graph,
  initialCellId,
}: {
  graph: EncyclopediaGraph;
  initialCellId?: string | null;
}) {
  const index = useMemo(() => new GraphIndex(graph), [graph]);
  const [scope, setScope] = useState<Scope>({ kind: "overview" });
  const [history, setHistory] = useState<Visit[]>([]);
  const [selected, setSelected] = useState<string | null>(
    initialCellId && index.byId.has(initialCellId) ? initialCellId : null,
  );
  const [reading, setReading] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SheetTab>("material");
  const searchRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const restore = useRef<Camera | null>(null);
  const searchTarget = useRef<string | null>(null);
  const {
    viewportRef,
    camera,
    current,
    readCamera,
    move,
    zoom,
    setCamera,
    dragging,
    suppressed,
    handlers,
  } = useMapCamera();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const byMap = useMemo(() => {
    const out = new Map<MapName, EncyclopediaCell[]>();
    for (const map of MAP_NAMES_ORDER) out.set(map, []);
    for (const cell of graph.cells)
      for (const m of cell.maps) out.get(m.map)?.push(cell);
    return out;
  }, [graph]);
  const entries = useMemo<Entry[]>(() => {
    if (scope.kind === "overview")
      return MAP_NAMES_ORDER.filter((m) => (byMap.get(m)?.length ?? 0) > 0).map(
        (map) => ({
          kind: "map",
          map,
          count: byMap.get(map)?.length ?? 0,
          names: (byMap.get(map) ?? []).slice(0, 3).map((c) => c.name),
        }),
      );
    if (scope.kind === "cell") {
      const cell = index.byId.get(scope.id);
      if (!cell) return [];
      return [
        ...index
          .childrenOf(scope.id)
          .filter((c) => c.id !== scope.id)
          .map((cell) => ({ kind: "cell", cell }) satisfies Entry),
        ...cell.manifestations.map(
          (manifestation, ordinal) =>
            ({ kind: "record", manifestation, ordinal }) satisfies Entry,
        ),
      ];
    }
    const cells = byMap.get(scope.map) ?? [];
    const members = new Set(cells.map((c) => c.id));
    const roots = cells.filter(
      (c) => !c.broader.some((p) => p.cellId !== c.id && members.has(p.cellId)),
    );
    // Preserve disconnected cycles: each component gets an entry point.
    const seen = new Set<string>();
    const visit = (start: string) => {
      const queue = [start];
      for (let at = 0; at < queue.length; at++) {
        const id = queue[at];
        if (seen.has(id)) continue;
        seen.add(id);
        for (const child of index.childrenOf(id))
          if (members.has(child.id) && !seen.has(child.id))
            queue.push(child.id);
      }
    };
    for (const root of roots) visit(root.id);
    for (const cell of cells)
      if (!seen.has(cell.id)) {
        roots.push(cell);
        visit(cell.id);
      }
    return roots
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((cell) => ({ kind: "cell", cell }));
  }, [scope, index, byMap]);
  const wideOverview = size.w >= 900;
  const grid = useMemo(() => {
    const g = makeGrid(entries.length);
    return scope.kind === "overview" && wideOverview
      ? {
          ...g,
          columns: Math.max(1, entries.length),
          rows: entries.length ? 1 : 0,
        }
      : g;
  }, [entries, scope.kind, wideOverview]);
  const tiles = useMemo(
    () => visibleTiles(grid, camera, size, scope.kind !== "overview"),
    [grid, camera, size, scope.kind],
  );
  const selectedCell = selected ? index.byId.get(selected) : undefined;
  const scopeCell =
    scope.kind === "cell" ? index.byId.get(scope.id) : undefined;
  const title =
    scope.kind === "overview"
      ? "All subjects"
      : scope.kind === "map"
        ? MAP_LABEL[scope.map]
        : (scopeCell?.name ?? "Topic");
  const results = useMemo(
    () => (query.trim() ? index.search(query, null).slice(0, 24) : []),
    [index, query],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [viewportRef]);
  const framed = useRef<{ grid: typeof grid; w: number; h: number } | null>(
    null,
  );
  useEffect(() => {
    if (!size.w || !size.h) return;
    const previous = framed.current;
    if (!previous || previous.grid !== grid) {
      const found = searchTarget.current
        ? entries.findIndex(
            (e) => e.kind === "cell" && e.cell.id === searchTarget.current,
          )
        : -1;
      const k = Math.min(0.95, (size.w - 48) / CARD_W);
      const target =
        found >= 0
          ? {
              k,
              x:
                size.w / 2 -
                ((found % grid.columns) * grid.pitchX + CARD_W / 2) * k,
              y: 24 - Math.floor(found / grid.columns) * grid.pitchY * k,
            }
          : null;
      move(
        target ??
          restore.current ??
          cameraFor(grid, size, scope.kind === "overview"),
        false,
      );
      restore.current = null;
      searchTarget.current = null;
    } else {
      setCamera({
        ...current.current,
        x: current.current.x + (size.w - previous.w) / 2,
        y: current.current.y + (size.h - previous.h) / 2,
      });
    }
    framed.current = { grid, ...size };
  }, [grid, size, move, setCamera, current, entries, scope.kind]);

  const enter = useCallback(
    (next: Scope) => {
      const previous = { scope, camera: readCamera() };
      setHistory((h) => [...h, previous]);
      setScope(next);
      setSelected(null);
      setReading(false);
      setQuery("");
    },
    [scope, readCamera],
  );
  const back = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;
    restore.current = last.camera;
    setScope(last.scope);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
    setReading(false);
  }, [history]);
  const home = () => {
    restore.current = null;
    setScope({ kind: "overview" });
    setHistory([]);
    setSelected(null);
    setReading(false);
    setQuery("");
  };
  const select = (id: string) => {
    setSelected(id);
    setReading(false);
    setTab("material");
  };
  const expand = (id: string) => enter({ kind: "cell", id });
  const close = () => {
    setSelected(null);
    setReading(false);
  };
  const zoomTile = (tile: Tile) => {
    const k = Math.min(
      1.2,
      Math.min(
        (size.w - 48) / Math.max(CARD_W, tile.w),
        (size.h - 48) / Math.max(CARD_H, tile.h),
      ) * 1.7,
    );
    move({
      k,
      x: size.w / 2 - (tile.x + tile.w / 2) * k,
      y: size.h / 2 - (tile.y + tile.h / 2) * k,
    });
  };
  const follow = useCallback(
    (id: string) => {
      const cell = index.byId.get(id);
      if (!cell) return;
      const parent = index.parentsOf(id).find((c) => c.id !== id);
      searchTarget.current = id;
      const previous = { scope, camera: readCamera() };
      setHistory((h) => [...h, previous]);
      setScope(
        parent
          ? { kind: "cell", id: parent.id }
          : { kind: "map", map: cell.maps[0]?.map ?? "art" },
      );
      setSelected(id);
      setReading(false);
      setTab("material");
    },
    [index, scope, readCamera],
  );

  // Only connectors between currently visible cells are painted. No scene-wide
  // DOM edge list or continuously running physics/animation loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.w, size.h);
    const css = getComputedStyle(canvas);
    ctx.fillStyle = css.getPropertyValue("--graphite").trim() || "#777";
    ctx.globalAlpha = 0.16;
    const pitch = 28,
      ox = ((camera.x % pitch) + pitch) % pitch,
      oy = ((camera.y % pitch) + pitch) % pitch;
    for (let x = ox; x < size.w; x += pitch)
      for (let y = oy; y < size.h; y += pitch) {
        ctx.beginPath();
        ctx.arc(x, y, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = css.getPropertyValue("--ramune").trim() || "#307ba5";
    ctx.lineWidth = 1;
    const positions = new Map<string, { x: number; y: number }>();
    for (const t of tiles)
      if (t.count === 1) {
        const e = entries[t.first];
        if (e?.kind === "cell")
          positions.set(e.cell.id, {
            x: camera.x + (t.x + CARD_W / 2) * camera.k,
            y: camera.y + (t.y + CARD_H / 2) * camera.k,
          });
      }
    const visible = [...positions];
    for (let a = 0; a < visible.length; a++)
      for (let b = a + 1; b < visible.length; b++) {
        const [id, p] = visible[a],
          [other, q] = visible[b];
        if (!index.areNeighbours(id, other)) continue;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
  }, [camera, size, tiles, entries, index]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (camera !== current.current) return;
      if (camera.k > 1.8) {
        const centerX = (size.w / 2 - camera.x) / camera.k,
          centerY = (size.h / 2 - camera.y) / camera.k;
        const col = Math.floor(centerX / grid.pitchX),
          row = Math.floor(centerY / grid.pitchY);
        const entry =
          col >= 0 && col < grid.columns && row >= 0
            ? entries[row * grid.columns + col]
            : undefined;
        if (entry?.kind === "map") enter({ kind: "map", map: entry.map });
        else if (
          entry?.kind === "cell" &&
          (index.childrenOf(entry.cell.id).length ||
            entry.cell.manifestations.length)
        )
          enter({ kind: "cell", id: entry.cell.id });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [camera, size, grid, entries, index, enter, current]);

  const detail = selectedCell ? (
    <>
      <div className="atlas-detail-top">
        <span className="atlas-eyebrow">Topic details</span>
        <button
          className="atlas-icon"
          onClick={close}
          aria-label="Close topic details"
        >
          <X size={20} />
        </button>
      </div>
      <h2>{selectedCell.name}</h2>
      <div className="atlas-detail-actions">
        <button
          className="atlas-primary"
          onClick={() => expand(selectedCell.id)}
          disabled={
            !index.childrenOf(selectedCell.id).length &&
            !selectedCell.manifestations.length
          }
        >
          <Expand size={16} /> Explore{" "}
          {index.childrenOf(selectedCell.id).length +
            selectedCell.manifestations.length}{" "}
          nodes
        </button>
        <button
          className="atlas-mobile-read"
          onClick={() => setReading((v) => !v)}
        >
          <BookOpen size={17} />
          {reading ? "Back to map" : "Read"}
        </button>
      </div>
      <div className="atlas-detail-body">
        <p>{selectedCell.description}</p>
        <MemoSheetBody
          cell={selectedCell}
          index={index}
          tab={tab}
          onTab={setTab}
          onFocus={follow}
        />
        <OpenCellButton cell={selectedCell} />
      </div>
    </>
  ) : null;

  return (
    <section
      className="atlas"
      aria-label="Encyclopedia explorer"
      data-rendered-nodes={tiles.length}
      data-total-nodes={entries.length}
    >
      <header className="atlas-header">
        <div>
          <span className="atlas-eyebrow">The design commons</span>
          <h1>
            Encyclopedia
            <span className="atlas-title-dot" aria-hidden />
          </h1>
        </div>
        <div className="atlas-search">
          <Search size={18} aria-hidden />
          <input
            ref={searchRef}
            aria-label="Search the encyclopedia"
            placeholder="Find a style, movement, or idea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
              if (e.key === "Enter" && results[0]) {
                follow(results[0].id);
                setQuery("");
              }
            }}
          />
          {query ? (
            <button
              className="atlas-icon"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={18} />
            </button>
          ) : (
            <span className="atlas-search-hint">/</span>
          )}
          {query.trim() && (
            <div className="atlas-results" aria-label="Search results">
              {results.length ? (
                results.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      follow(c.id);
                      setQuery("");
                    }}
                  >
                    <strong>{c.name}</strong>
                    <span>
                      {c.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))
              ) : (
                <p>No matches. Try another name.</p>
              )}
              {results.length === 24 && (
                <p>Keep typing to narrow the results.</p>
              )}
            </div>
          )}
        </div>
      </header>
      <nav className="atlas-breadcrumbs" aria-label="Exploration path">
        <button onClick={home} aria-label="All subjects">
          <Home size={16} />
          <span>Encyclopedia</span>
        </button>
        {history.slice(1).map((visit, i) => (
          <span key={i} className="atlas-crumb">
            <ChevronRight size={14} />
            <button
              onClick={() => {
                restore.current = visit.camera;
                setScope(visit.scope);
                setHistory((h) => h.slice(0, i + 1));
                close();
              }}
            >
              {visit.scope.kind === "map"
                ? MAP_LABEL[visit.scope.map]
                : visit.scope.kind === "cell"
                  ? index.byId.get(visit.scope.id)?.name
                  : "All subjects"}
            </button>
          </span>
        ))}
        {scope.kind !== "overview" && (
          <span className="atlas-crumb">
            <ChevronRight size={14} />
            <strong>{title}</strong>
          </span>
        )}
        <span className="atlas-library-count">
          {graph.cells.length.toLocaleString()} topics
        </span>
      </nav>
      <div className="atlas-body">
        <div className="atlas-map-column">
          <div
            ref={viewportRef}
            className="atlas-viewport"
            tabIndex={0}
            aria-label="Explore the map. Drag to pan, pinch or scroll to zoom. Plus and minus zoom; arrow keys pan; Escape goes back."
            style={{ cursor: dragging ? "grabbing" : "grab" }}
            {...handlers}
            onKeyDown={(e) => {
              if (
                e.target instanceof Element &&
                e.target.closest("button,a,input")
              )
                return;
              const pan: Record<string, [number, number]> = {
                ArrowLeft: [80, 0],
                ArrowRight: [-80, 0],
                ArrowUp: [0, 80],
                ArrowDown: [0, -80],
              };
              if (pan[e.key]) {
                e.preventDefault();
                const [x, y] = pan[e.key];
                move(
                  {
                    ...current.current,
                    x: current.current.x + x,
                    y: current.current.y + y,
                  },
                  false,
                );
              } else if (e.key === "+" || e.key === "=") {
                e.preventDefault();
                zoom(1.5);
              } else if (e.key === "-") {
                e.preventDefault();
                zoom(1 / 1.5);
              } else if (e.key === "0") {
                e.preventDefault();
                move(cameraFor(grid, size, true));
              } else if (e.key === "Escape") {
                if (selected) close();
                else back();
              } else if (e.key === "/") {
                e.preventDefault();
                searchRef.current?.focus();
              }
            }}
            onClickCapture={(e) => {
              if (suppressed.current && e.detail !== 0) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <canvas ref={canvasRef} className="atlas-canvas" aria-hidden />
            {tiles.map((tile) => {
              const entry = entries[tile.first];
              if (!entry) return null;
              const left = camera.x + tile.x * camera.k,
                top = camera.y + tile.y * camera.k;
              if (tile.count > 1)
                return (
                  <button
                    key={tile.key}
                    className="atlas-cluster"
                    style={{
                      left,
                      top,
                      width: Math.max(100, tile.w * camera.k),
                      height: Math.max(100, tile.h * camera.k),
                    }}
                    onClick={() => zoomTile(tile)}
                    aria-label={"Zoom into " + tile.count + " nodes"}
                  >
                    <span className="atlas-cluster-mark" aria-hidden />
                    <strong>{tile.count.toLocaleString()}</strong>
                    <span>nodes</span>
                    <small>
                      {entryName(entry)} — {entryName(entries[tile.last])}
                    </small>
                    <span className="atlas-cluster-action">
                      Zoom to explore <Plus size={16} />
                    </span>
                  </button>
                );
              const compact = camera.k < 0.58;
              const style = {
                left,
                top,
                width: CARD_W * camera.k,
                height: CARD_H * camera.k,
              };
              if (entry.kind === "map")
                return (
                  <button
                    key={entryKey(entry)}
                    className={
                      "atlas-node atlas-region" + (compact ? " is-compact" : "")
                    }
                    style={{ ...style, ...inkStyle(INK[entry.map]) }}
                    onClick={() => enter({ kind: "map", map: entry.map })}
                  >
                    <span className="atlas-eyebrow">Explore a subject</span>
                    <span className="atlas-region-symbol" aria-hidden>
                      {entry.map === "art"
                        ? "Aa"
                        : entry.map === "writing"
                          ? "“ ”"
                          : entry.map === "palettes"
                            ? "●"
                            : "↗"}
                    </span>
                    <h2>{MAP_LABEL[entry.map]}</h2>
                    <p>{entry.count.toLocaleString()} topics</p>
                    <span className="atlas-region-names">
                      {entry.names.join(" · ")}
                    </span>
                    <span className="atlas-card-footer">
                      Enter map <ArrowUpRight size={20} />
                    </span>
                  </button>
                );
              if (entry.kind === "record")
                return entry.manifestation.record ? (
                  <a
                    key={entryKey(entry)}
                    className="atlas-node atlas-record"
                    style={style}
                    href={entry.manifestation.record.href}
                  >
                    <RecordCard manifestation={entry.manifestation} />
                  </a>
                ) : (
                  <article
                    key={entryKey(entry)}
                    className="atlas-node atlas-record"
                    style={style}
                  >
                    <RecordCard manifestation={entry.manifestation} />
                  </article>
                );
              const cell = entry.cell,
                children = index
                  .childrenOf(cell.id)
                  .filter((c) => c.id !== cell.id).length;
              const ink = INK[cell.maps[0]?.map ?? "art"];
              return (
                <article
                  key={cell.id}
                  className={
                    "atlas-node atlas-topic" +
                    (selected === cell.id ? " is-selected" : "") +
                    (compact ? " is-compact" : "")
                  }
                  style={{ ...style, ...inkStyle(ink) }}
                  aria-label={cell.name}
                >
                  <button
                    className="atlas-topic-main"
                    onClick={() => select(cell.id)}
                    aria-label={"Read about " + cell.name}
                  >
                    <span className="atlas-eyebrow">
                      {cell.maps.map((m) => MAP_LABEL[m.map]).join(" · ")}
                    </span>
                    <h2>{cell.name}</h2>
                    {!compact && <Specimen cell={cell} />}
                    {compact && (
                      <span className="atlas-compact-count">
                        {children
                          ? children + " child topics"
                          : cell.manifestations.length + " examples"}
                      </span>
                    )}
                  </button>
                  <div className="atlas-topic-actions">
                    <button
                      onClick={() => select(cell.id)}
                      aria-label={"Read " + cell.name}
                    >
                      <BookOpen size={18} />
                      <span>Read</span>
                    </button>
                    <button
                      onClick={() => expand(cell.id)}
                      disabled={!children && !cell.manifestations.length}
                      aria-label={"Explore " + cell.name}
                    >
                      <span>
                        {children
                          ? children + " children"
                          : cell.manifestations.length + " examples"}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
            {!entries.length && (
              <div className="atlas-empty">
                <h2>
                  {graph.cells.length
                    ? "No child topics or examples yet"
                    : "The encyclopedia has no readable topics yet."}
                </h2>
                <p>
                  {scopeCell?.description ??
                    "The map will appear when attested encyclopedia entries are available."}
                </p>
                {history.length > 0 && (
                  <button className="atlas-primary" onClick={back}>
                    Back to topics
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="atlas-map-controls" data-map-control>
            <div className="atlas-view-label">
              {history.length > 0 && (
                <button
                  className="atlas-icon"
                  onClick={back}
                  aria-label="Back to previous map"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <span>
                <strong>{title}</strong>
                <small>
                  {scope.kind === "overview"
                    ? "Choose a subject to begin"
                    : camera.k < 0.4
                      ? "Zoom in to reveal individual topics"
                      : "Select a topic to read or explore"}
                </small>
              </span>
            </div>
            <div className="atlas-zoom">
              <button
                className="atlas-icon"
                aria-label="Zoom out"
                onClick={() => zoom(1 / 1.5)}
              >
                <Minus size={18} />
              </button>
              <button
                className="atlas-fit"
                onClick={() => move(cameraFor(grid, size, true))}
                title="Fit this map (0)"
                aria-label="Fit this map"
              >
                {Math.round(camera.k * 100)}%
              </button>
              <button
                className="atlas-icon"
                aria-label="Zoom in"
                onClick={() => zoom(1.5)}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </div>
        {detail && (
          <aside
            className={"atlas-detail" + (reading ? " is-reading" : "")}
            aria-label="Topic details"
          >
            {detail}
          </aside>
        )}
      </div>
      <footer className="atlas-footer">
        <span>
          {scope.kind === "overview"
            ? "Art, writing, palettes, and design — connected."
            : entries.length.toLocaleString() + " nodes in this view"}
        </span>
        <span>Drag to move · Pinch or scroll to zoom</span>
      </footer>
    </section>
  );
}
