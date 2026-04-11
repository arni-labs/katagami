"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface GraphNode {
  id: string;
  name: string;
  status: string;
  lineageType: string;
  generation: number;
  parentIds: string[];
}

const lineageColors: Record<string, string> = {
  original: "border-blue-400 bg-blue-50 dark:bg-blue-950",
  evolution: "border-green-400 bg-green-50 dark:bg-green-950",
  remix: "border-purple-400 bg-purple-50 dark:bg-purple-950",
};

export function LineageGraph({
  nodes,
  highlightId,
}: {
  nodes: GraphNode[];
  highlightId?: string;
}) {
  // Group by generation
  const byGeneration = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const gen = node.generation;
    const group = byGeneration.get(gen) ?? [];
    group.push(node);
    byGeneration.set(gen, group);
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b);

  // Build parent lookup for edge drawing
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="space-y-8">
      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50" />
          <span>Original</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-green-400 bg-green-50" />
          <span>Evolution</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-purple-400 bg-purple-50" />
          <span>Remix</span>
        </div>
      </div>

      {/* Generation layers */}
      {generations.map((gen) => {
        const genNodes = byGeneration.get(gen) ?? [];
        return (
          <div key={gen}>
            <h3 className="text-xs font-medium text-muted-foreground mb-2">
              Generation {gen}
            </h3>
            <div className="flex flex-wrap gap-3">
              {genNodes.map((node) => {
                const isHighlighted = highlightId === node.id;
                return (
                  <Link key={node.id} href={`/language/${node.id}`}>
                    <div
                      className={`
                        rounded-lg border-2 p-3 min-w-[180px] transition-all
                        ${lineageColors[node.lineageType] ?? "border-border"}
                        ${isHighlighted ? "ring-2 ring-primary shadow-lg" : ""}
                        hover:shadow-md cursor-pointer
                      `}
                    >
                      <p className="font-medium text-sm">{node.name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4"
                        >
                          {node.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4"
                        >
                          {node.lineageType}
                        </Badge>
                      </div>
                      {/* Parent references */}
                      {node.parentIds.length > 0 && (
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          {node.parentIds.length === 1 ? "from" : "remix of"}{" "}
                          {node.parentIds.map((pid, i) => {
                            const parent = nodeMap.get(pid);
                            return (
                              <span key={pid}>
                                {i > 0 && " + "}
                                <span className="font-medium">
                                  {parent?.name ?? pid.slice(0, 8)}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Stats */}
      <div className="border-t pt-4 flex gap-6 text-sm text-muted-foreground">
        <span>{nodes.length} languages</span>
        <span>{nodes.filter((n) => n.lineageType === "original").length} originals</span>
        <span>{nodes.filter((n) => n.lineageType === "evolution").length} evolutions</span>
        <span>{nodes.filter((n) => n.lineageType === "remix").length} remixes</span>
      </div>
    </div>
  );
}
