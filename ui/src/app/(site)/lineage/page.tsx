import { listDesignLanguages, parseJson } from "@/lib/odata";
import { LineageGraph } from "@/components/lineage-graph";
import { PageHero, Marker } from "@/components/page-hero";
import {
  StickyNote,
  WashiTape,
  Stamp,
} from "@/components/scrapbook";

export default async function LineagePage({
  searchParams,
}: {
  searchParams: Promise<{ root?: string }>;
}) {
  const sp = await searchParams;

  let languages;
  try {
    // Published-only: draft/archived languages never appear in lineage.
    languages = await listDesignLanguages("Status eq 'Published'");
  } catch {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <PageHero
          eyebrowAccent="ramune"
          eyebrow="provenance"
          title={<Marker color="ramune">lineage</Marker>}
          description="Could not reach the server."
        />
        <StickyNote className="p-6 text-center font-mono text-sm text-muted-foreground">
          ensure the temper server is running
        </StickyNote>
      </div>
    );
  }

  // Lineage kind and generation are DERIVED from the parent graph — the single
  // source of truth — not from the stored `lineage_type` / `generation_number`
  // fields, which are noisy (blank, "curated_from_query", …) and disagree with
  // `parent_ids`. Deriving guarantees the legend always sums to the total and
  // that "originals" means exactly one thing: a language with no parents.
  const parsed = languages.map((l) => ({
    id: l.entity_id,
    name: l.fields.name ?? l.entity_id.slice(0, 12),
    status: l.status,
    parentIds: (parseJson<string[]>(l.fields.parent_ids) ?? []).filter(Boolean),
  }));
  const byId = new Map(parsed.map((n) => [n.id, n]));

  const genCache = new Map<string, number>();
  const generationOf = (id: string, depth = 0): number => {
    const cached = genCache.get(id);
    if (cached !== undefined) return cached;
    const node = byId.get(id);
    let gen: number;
    if (!node || node.parentIds.length === 0) {
      gen = 0; // a root within the published set → an original
    } else if (depth > 64) {
      gen = 1; // cycle guard
    } else {
      const inSet = node.parentIds.filter((p) => byId.has(p));
      gen =
        inSet.length === 0
          ? 1 // derived from an ancestor outside the published set
          : 1 + Math.max(...inSet.map((p) => generationOf(p, depth + 1)));
    }
    genCache.set(id, gen);
    return gen;
  };
  const kindOf = (count: number) =>
    count === 0 ? "original" : count === 1 ? "evolution" : "remix";

  const nodes = parsed.map((n) => ({
    ...n,
    lineageType: kindOf(n.parentIds.length),
    generation: generationOf(n.id),
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-10 sm:py-10">
      <PageHero
        eyebrowAccent="ramune"
        eyebrow="provenance"
        title={
          <>
            <Marker color="ramune">lineage</Marker>{" "}
            <Marker color="sumire">explorer</Marker>
          </>
        }
        description="A family tree of design languages — how each one inherited, evolved, or remixed its ancestors. Cards are grouped by generation; click any to jump to its detail page."
        rightSlot={
          <>
            <Stamp color="ramune">family tree</Stamp>
            <Stamp color="sumire" rotate={3}>
              {nodes.length} nodes
            </Stamp>
          </>
        }
      />

      {nodes.length === 0 ? (
        <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
          no design languages found yet
        </StickyNote>
      ) : (
        <div className="relative">
          <WashiTape
            color="ramune"
            rotate={-4}
            className="-left-2 -top-3"
            width={90}
          />
          <WashiTape
            color="sumire"
            rotate={5}
            className="-right-2 -top-3"
            width={70}
          />
          <LineageGraph nodes={nodes} highlightId={sp.root} />
        </div>
      )}
    </div>
  );
}
