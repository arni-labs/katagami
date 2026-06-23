import { parseJson } from "@/lib/odata";

type Credit = { name?: string; kind?: string; note?: string };

const KIND_LABEL: Record<string, string> = {
  artist: "Artist",
  movement: "Movement",
  studio: "Studio",
  tradition: "Tradition",
};

/**
 * Attribution for a design language / palette / art style. A generated style is
 * an aggregate of many influences, so `credits` is a list of {name, kind, note}.
 * Renders nothing when there are no credits, so it is safe to drop into any
 * detail page unconditionally.
 */
export function Credits({ raw }: { raw?: string }) {
  const credits = (parseJson<Credit[]>(raw) ?? []).filter(
    (c): c is Credit => !!c && typeof c.name === "string" && c.name.length > 0,
  );
  if (credits.length === 0) return null;

  return (
    <section className="sticker-card p-5 sm:p-6">
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        Credits · in the lineage of
      </div>
      <ul className="space-y-2.5">
        {credits.map((c, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[15px] text-foreground">{c.name}</span>
            {c.kind ? (
              <span className="rounded-[2px] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                {KIND_LABEL[c.kind] ?? c.kind}
              </span>
            ) : null}
            {c.note ? (
              <span className="w-full text-[13px] leading-relaxed text-muted-foreground sm:flex-1">
                {c.note}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/70">
        A generated style is an aggregate of many influences — credit is given to the artists
        and traditions it draws on, not a claim of authorship.
      </p>
    </section>
  );
}
