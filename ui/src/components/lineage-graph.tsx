"use client";

import Link from "next/link";
import { CornerDownRight } from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  status: string;
  lineageType: string;
  generation: number;
  parentIds: string[];
}

type AccentColor = "teal" | "salad" | "sumire" | "sakura" | "yuzu" | "ramune";

const lineageTint: Record<string, AccentColor> = {
  original: "teal",
  evolution: "salad",
  remix: "sumire",
};

const statusTint: Record<string, AccentColor> = {
  Published: "salad",
  UnderReview: "yuzu",
  Draft: "ramune",
  Archived: "sakura",
};

const genLabel = (gen: number) => {
  if (gen === 0) return "originals";
  if (gen === 1) return "first evolutions";
  if (gen === 2) return "second wave";
  return `generation ${gen}`;
};

export function LineageGraph({
  nodes,
  highlightId,
}: {
  nodes: GraphNode[];
  highlightId?: string;
}) {
  const byGeneration = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const gen = node.generation;
    const group = byGeneration.get(gen) ?? [];
    group.push(node);
    byGeneration.set(gen, group);
  }
  const generations = [...byGeneration.keys()].sort((a, b) => a - b);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const counts = {
    original: nodes.filter((n) => n.lineageType === "original").length,
    evolution: nodes.filter((n) => n.lineageType === "evolution").length,
    remix: nodes.filter((n) => n.lineageType === "remix").length,
  };

  return (
    <div className="space-y-10">
      {/* Legend — reads like a little key pinned at the top */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          key
        </span>
        <LegendChip label={`${counts.original} original`} color="teal" />
        <LegendChip label={`${counts.evolution} evolution`} color="salad" />
        <LegendChip label={`${counts.remix} remix`} color="sumire" />
        <span className="ml-1 font-mono text-[10px] text-muted-foreground/60">
          · {nodes.length} total
        </span>
      </div>

      {/* Generations — each is a horizontal scroll row */}
      {generations.map((gen, idx) => {
        const genNodes = byGeneration.get(gen) ?? [];
        return (
          <section key={gen} className="relative">
            {/* Generation header — dashed rule with marker-highlighted label */}
            <div className="relative mb-4 flex items-center gap-3">
              <span
                aria-hidden
                className="inline-block h-[3px] w-8 rounded-[1px] bg-[var(--ramune)]"
              />
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  gen {String(gen).padStart(2, "0")}
                </span>
                <h3 className="font-display text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                  <span className="marker">
                    <span
                      aria-hidden
                      className="marker-fill"
                      style={{ background: `var(--yuzu)` }}
                    />
                    <span className="marker-text">{genLabel(gen)}</span>
                  </span>
                </h3>
              </div>
              <span
                aria-hidden
                className="h-px flex-1 border-t border-dashed border-border"
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                {genNodes.length}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {genNodes.map((node) => (
                <LineageCard
                  key={node.id}
                  node={node}
                  nodeMap={nodeMap}
                  isHighlighted={highlightId === node.id}
                />
              ))}
            </div>

            {/* separator between gens (except last) */}
            {idx < generations.length - 1 && (
              <div
                aria-hidden
                className="mt-8 flex items-center justify-center"
              >
                <span className="font-mono text-[14px] leading-none text-foreground/25">
                  ▾ ▾ ▾
                </span>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function LineageCard({
  node,
  nodeMap,
  isHighlighted,
}: {
  node: GraphNode;
  nodeMap: Map<string, GraphNode>;
  isHighlighted: boolean;
}) {
  const tint = lineageTint[node.lineageType] ?? "ramune";
  const status = statusTint[node.status] ?? "ramune";
  const rot = (((node.id.charCodeAt(0) + node.id.length) % 7) - 3) * 0.2;

  return (
    <Link
      href={`/language/${node.id}`}
      className="group relative block transition-transform duration-200 hover:-translate-y-[2px] hover:rotate-0"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <article
        className="relative p-3.5 shadow-[0_1px_2px_rgba(30,35,45,0.05),0_4px_12px_rgba(30,35,45,0.06)] transition-shadow duration-200 group-hover:shadow-[0_2px_4px_rgba(30,35,45,0.06),0_12px_24px_rgba(30,35,45,0.09)]"
        style={{
          background: `color-mix(in srgb, var(--${tint}) 10%, rgba(255, 255, 255, 0.78))`,
        }}
      >
        {/* highlighted = yuzu marker wash behind everything */}
        {isHighlighted && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{ background: "var(--yuzu)" }}
          />
        )}

        {/* lineage type ribbon — thin colored bar on top */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[4px]"
          style={{ background: `var(--${tint})` }}
        />

        <div className="relative flex items-start justify-between gap-2">
          <h4 className="flex-1 font-display text-[15px] font-bold leading-tight tracking-[-0.02em]">
            {node.name}
          </h4>
          <span
            className="stamp shrink-0"
            style={{ color: `var(--${status})` }}
          >
            {node.status}
          </span>
        </div>

        <div className="relative mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span
            className="inline-flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-0.5 font-mono uppercase tracking-[0.1em]"
            style={{
              background: `color-mix(in oklch, var(--${tint}) 30%, white)`,
            }}
          >
            {node.lineageType}
          </span>
          <span className="font-mono text-muted-foreground/70">
            gen {node.generation}
          </span>
        </div>

        {node.parentIds.length > 0 && (
          <div className="relative mt-2.5 border-t border-dashed border-border pt-2">
            <div className="flex items-start gap-1.5 font-mono text-[10px]">
              <CornerDownRight className="mt-[1px] h-3 w-3 shrink-0 text-[var(--sumire)]" />
              <span className="flex-1">
                <span className="uppercase tracking-[0.12em] text-muted-foreground">
                  {node.lineageType === "remix" ? "remix of " : "from "}
                </span>
                {node.parentIds.map((pid, i) => {
                  const parent = nodeMap.get(pid);
                  const name = parent?.name ?? pid.slice(0, 10);
                  return (
                    <span key={pid} className="text-foreground/80">
                      {i > 0 && (
                        <span className="mx-0.5 text-foreground/30">+</span>
                      )}
                      <span className="font-medium">{name}</span>
                    </span>
                  );
                })}
              </span>
            </div>
          </div>
        )}

        {/* arrow on hover hinting "open" */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 right-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/0 transition-all duration-200 group-hover:text-muted-foreground group-hover:-translate-y-[1px]"
        >
          open ↗
        </span>
      </article>
    </Link>
  );
}

function LegendChip({ label, color }: { label: string; color: AccentColor }) {
  return (
    <span
      className="inline-flex items-center gap-2 border border-border bg-white/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/80"
      style={{ boxShadow: "0 1px 2px rgba(30,35,45,0.04)" }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: `var(--${color})` }}
      />
      {label}
    </span>
  );
}
