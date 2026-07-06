import Link from "next/link";
import {
  listArtStyles,
  listDesignLanguages,
  listPaletteSystems,
} from "@/lib/odata";
import { Marker } from "@/components/page-hero";
import { SectionHeading, StickyNote, WashiTape } from "@/components/scrapbook";
import { withdrawSubmission } from "./submission-actions";

// Everything submitted under this account — by the human or any of their
// agents (ARN-154). UnderReview items can be withdrawn before a curator
// sees them; Draft items are still being authored; Published ones made it.

type Row = {
  kind: "language" | "palette" | "art_style";
  id: string;
  name: string;
  status: string;
  href: string;
};

const PATHS = { language: "language", palette: "palettes", art_style: "art-styles" } as const;
const KIND_LABEL = { language: "design language", palette: "palette", art_style: "art style" } as const;

export default async function SubmissionsSection({ sub }: { sub: string }) {
  const byMe = `creator_sub eq '${sub}'`;
  const [languages, palettes, artStyles] = await Promise.all([
    listDesignLanguages(byMe).catch(() => []),
    listPaletteSystems(byMe).catch(() => []),
    listArtStyles(byMe).catch(() => []),
  ]);

  const rows: Row[] = [
    ...languages.map((e) => toRow("language", e)),
    ...palettes.map((e) => toRow("palette", e)),
    ...artStyles.map((e) => toRow("art_style", e)),
  ].sort((a, b) => rank(a.status) - rank(b.status));

  return (
    <section className="relative">
      <WashiTape color="yuzu" rotate={-2} className="-left-3 -top-3" width={90} />
      <StickyNote className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeading eyebrow="submissions" eyebrowColor="yuzu">
            <Marker color="yuzu">Your submissions</Marker>
          </SectionHeading>
          <span className="stamp text-[var(--yuzu)]">
            {rows.length} {rows.length === 1 ? "item" : "items"}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">
          Work submitted under your name — by you or your agents. Reviews are a
          curator&apos;s call; you can withdraw anything still in the queue.{" "}
          <Link
            href="/account/agents"
            className="text-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-2"
          >
            Manage agent access →
          </Link>
        </p>

        {rows.length > 0 ? (
          <div className="mt-5 space-y-2.5">
            {rows.map((r) => (
              <article
                key={`${r.kind}-${r.id}`}
                className="flex flex-col gap-1.5 bg-background/70 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-foreground">
                    {r.name || "(unnamed draft)"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {KIND_LABEL[r.kind]} · {r.status}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <Link
                    href={r.href}
                    className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color-mix(in_oklch,var(--yuzu)_72%,var(--foreground))] transition-colors hover:text-foreground"
                  >
                    preview →
                  </Link>
                  {r.status === "UnderReview" ? (
                    <form action={withdrawSubmission}>
                      <input type="hidden" name="kind" value={r.kind} />
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="font-mono text-[10px] uppercase tracking-[0.16em] text-destructive transition-colors hover:text-foreground"
                      >
                        withdraw
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">
            Nothing submitted yet. Connect an agent to the Katagami MCP server
            (or use the katagami CLI) and remix something you love.
          </p>
        )}
      </StickyNote>
    </section>
  );
}

function toRow(
  kind: Row["kind"],
  e: { entity_id: string; status?: string; fields: Record<string, string | undefined> },
): Row {
  return {
    kind,
    id: e.entity_id,
    name: e.fields.name ?? "",
    status: e.status ?? "",
    href: `/${PATHS[kind]}/${e.entity_id}`,
  };
}

function rank(status: string): number {
  return status === "UnderReview" ? 0 : status === "Draft" ? 1 : status === "Published" ? 2 : 3;
}
