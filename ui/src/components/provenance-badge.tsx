const TIER_LABEL: Record<string, string> = {
  human_curated: "Human-curated",
  human_authored: "Human-authored",
};

/**
 * Provenance badge — WHO did the creative work (ADR-0016), distinct from lineage
 * (what a language descends from). Only the human tiers are worth surfacing: they
 * mark a language a person curated or authored, apart from pure pipeline output.
 *
 * Agent-generated (or unset, which defaults to agent_generated) is the unmarked
 * default on cards and on the language detail page. Mirrors the Credits /
 * ModelProvenance chip conventions: same tokens, and `return null` when there
 * is nothing to show.
 */
export function ProvenanceBadge({ tier }: { tier?: string }) {
  const t = (tier ?? "").trim();
  if (t !== "human_curated" && t !== "human_authored") {
    return null;
  }

  return (
    <span
      className="inline-flex min-w-0 items-center gap-1.5 rounded-[2px] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]"
      style={{
        background: "color-mix(in srgb, var(--matcha) 16%, transparent)",
        color: "color-mix(in srgb, var(--matcha) 70%, var(--foreground))",
      }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: "var(--matcha)" }}
      />
      <span className="truncate">{TIER_LABEL[t]}</span>
    </span>
  );
}
