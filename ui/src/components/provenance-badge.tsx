const TIER_LABEL: Record<string, string> = {
  human_curated: "Human-curated",
  human_authored: "Human-authored",
  agent_generated: "Agent-generated",
};

/**
 * Provenance badge — WHO did the creative work (ADR-0016), distinct from lineage
 * (what a language descends from). Only the human tiers are worth surfacing: they
 * mark a language a person curated or authored, apart from pure pipeline output.
 *
 * On a gallery card the agent-generated / empty case renders nothing, so the wall
 * isn't cluttered with a badge every card would carry. On a detail page a muted
 * "Agent-generated" line is fine for context. Mirrors the Credits / ModelProvenance
 * chip conventions: same tokens, and `return null` when there is nothing to show.
 */
export function ProvenanceBadge({
  tier,
  variant = "card",
}: {
  tier?: string;
  variant?: "card" | "detail";
}) {
  const t = (tier ?? "").trim();
  const isHuman = t === "human_curated" || t === "human_authored";

  if (isHuman) {
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

  // Agent-generated (or unset, which defaults to agent_generated): silent on the
  // card, a quiet contextual line on the detail page.
  if (variant === "detail") {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
        {TIER_LABEL.agent_generated}
      </p>
    );
  }
  return null;
}
