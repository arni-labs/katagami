import { parseJson } from "@/lib/odata";

type ModelRef = { model?: string; tool?: string } | string;
type Provenance = { style?: ModelRef; source?: ModelRef; images?: ModelRef };

function modelOf(r?: ModelRef): string {
  if (!r) return "";
  return typeof r === "string" ? r : r.model || "";
}

/**
 * Which AI models produced this entity: the model that authored the recipe/spec,
 * the model that sourced/identified it, and the model that generated its sample
 * images. Renders nothing when no provenance is recorded.
 */
export function ModelProvenance({ raw }: { raw?: string }) {
  const p = parseJson<Provenance>(raw) ?? {};
  const rows = (
    [
      ["produced by", modelOf(p.style)],
      ["sourced by", modelOf(p.source)],
      ["images by", modelOf(p.images)],
    ] as [string, string][]
  ).filter(([, v]) => v.length > 0);
  if (rows.length === 0) return null;

  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
      {rows.map(([label, value], i) => (
        <span key={label}>
          {i > 0 ? "  ·  " : ""}
          {label} <span className="text-muted-foreground">{value}</span>
        </span>
      ))}
    </p>
  );
}
