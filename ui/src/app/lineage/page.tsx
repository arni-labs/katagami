import { listDesignLanguages, parseJson } from "@/lib/odata";
import { LineageGraph } from "@/components/lineage-graph";
import { PageHero, Marker } from "@/components/page-hero";
import {
  StickyNote,
  WashiTape,
  Stamp,
  Perforation,
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

  const originalCount = nodes.filter((n) => n.lineageType === "original")
    .length;
  const evolutionCount = nodes.filter((n) => n.lineageType === "evolution")
    .length;
  const remixCount = nodes.filter((n) => n.lineageType === "remix").length;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <PageHero
        eyebrowAccent="ramune"
        eyebrow="provenance"
        title={
          <>
            <Marker color="ramune">lineage</Marker> explorer
          </>
        }
        description="A visual family tree of design languages — how they evolve, get remixed, and branch into new forms."
        rightSlot={
          <>
            <Stamp color="ramune">family tree</Stamp>
            <Stamp color="sumire" rotate={3}>
              {nodes.length} nodes
            </Stamp>
          </>
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        <LegendChip label={`${originalCount} original`} color="teal" />
        <LegendChip label={`${evolutionCount} evolution`} color="salad" />
        <LegendChip label={`${remixCount} remix`} color="sakura" />
        {sp.root && (
          <LegendChip label={`highlight ${sp.root.slice(0, 8)}`} color="yuzu" />
        )}
      </div>

      <Perforation />

      {nodes.length === 0 ? (
        <StickyNote className="flex items-center justify-center p-16 text-center font-mono text-sm text-muted-foreground">
          no design languages found yet
        </StickyNote>
      ) : (
        <div className="relative">
          <WashiTape
            color="ramune"
            rotate={-4}
            className="-left-3 -top-3"
            width={90}
          />
          <WashiTape
            color="sumire"
            rotate={5}
            className="-right-3 -top-3"
            width={70}
          />
          <StickyNote className="overflow-hidden p-4">
            <LineageGraph nodes={nodes} highlightId={sp.root} />
          </StickyNote>
        </div>
      )}
    </div>
  );
}

function LegendChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 border border-border bg-white/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/80"
      style={{ boxShadow: "0 1px 2px rgba(30,35,45,0.04)" }}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: `var(--${color})` }}
      />
      {label}
    </span>
  );
}
