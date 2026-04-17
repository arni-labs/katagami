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
    languages = await listDesignLanguages();
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

  const nodes = languages.map((l) => ({
    id: l.entity_id,
    name: l.fields.name ?? l.entity_id.slice(0, 12),
    status: l.status,
    lineageType: l.fields.lineage_type ?? "original",
    generation: parseInt(l.fields.generation_number ?? "0", 10),
    parentIds: parseJson<string[]>(l.fields.parent_ids) ?? [],
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
