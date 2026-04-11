import { listDesignLanguages, parseJson } from "@/lib/odata";
import { LineageGraph } from "@/components/lineage-graph";

export default async function LineagePage({
  searchParams,
}: {
  searchParams: Promise<{ root?: string }>;
}) {
  const sp = await searchParams;

  let languages;
  try {
    languages = await listDesignLanguages();
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Lineage Explorer</h1>
        <p className="text-muted-foreground">
          Could not load design languages. Ensure the server is running.
        </p>
      </div>
    );
  }

  // Build graph data
  const nodes = languages.map((l) => ({
    id: l.entity_id,
    name: l.fields.name ?? l.entity_id.slice(0, 12),
    status: l.status,
    lineageType: l.fields.lineage_type ?? "original",
    generation: parseInt(l.fields.generation_number ?? "0", 10),
    parentIds: parseJson<string[]>(l.fields.parent_ids) ?? [],
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lineage Explorer</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visual provenance graph showing evolution and remix relationships.
        </p>
      </div>

      {nodes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No design languages found.
        </div>
      ) : (
        <LineageGraph nodes={nodes} highlightId={sp.root} />
      )}
    </div>
  );
}
