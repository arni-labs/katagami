import type { ScreenPlan } from "@/lib/genui/catalogue";

// What was chosen and how long it took, in the site's mono label voice.
export function Chosen({ plan, ms, model, error }: { plan: ScreenPlan; ms: number | null; model: string | null; error?: string }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      <span className="text-foreground">{plan.source === "jev" ? `Jev chose` : `Fallback chose`}</span>
      {" · "}{plan.archetype} · {plan.components.join(" + ")} · {plan.density} · {plan.emphasis}
      {plan.components.includes("form") ? ` · ${plan.form} form` : ""}
      {plan.components.includes("table") ? ` · ${plan.table}` : ""}
      {ms !== null ? ` · ${ms} ms` : ""}
      {model ? ` · ${model}` : ""}
      {error ? <span className="block normal-case tracking-normal text-[var(--beni)]">Jev could not be asked: {error}</span> : null}
    </div>
  );
}
