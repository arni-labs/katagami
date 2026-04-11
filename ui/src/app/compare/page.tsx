import { Suspense } from "react";
import { getDesignLanguage, listDesignLanguages, parseJson } from "@/lib/odata";
import { SpecPanel } from "@/components/spec-panel";
import { EmbodimentViewer } from "@/components/embodiment-viewer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CompareSelector } from "@/components/compare-selector";

async function ComparisonView({ idA, idB }: { idA: string; idB: string }) {
  const [langA, langB] = await Promise.all([
    getDesignLanguage(idA),
    getDesignLanguage(idB),
  ]);

  const sides = [langA, langB];

  return (
    <div className="space-y-8">
      {/* Side-by-side headers */}
      <div className="grid grid-cols-2 gap-4">
        {sides.map((lang) => (
          <div key={lang.entity_id}>
            <h2 className="text-xl font-bold">{lang.fields.name ?? "Untitled"}</h2>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">{lang.status}</Badge>
              <Badge variant="outline">{lang.fields.lineage_type ?? "original"}</Badge>
              <Badge variant="outline">v{lang.counters.version ?? 0}</Badge>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Spec comparison */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Specification</h3>
        <div className="grid grid-cols-2 gap-4">
          {sides.map((lang) => (
            <div key={lang.entity_id}>
              <SpecPanel
                philosophy={lang.fields.philosophy}
                tokens={lang.fields.tokens}
                rules={lang.fields.rules}
                layout={lang.fields.layout_principles}
                guidance={lang.fields.guidance}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Token diff highlights */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Token Comparison</h3>
        <TokenDiff
          tokensA={parseJson<Record<string, unknown>>(langA.fields.tokens)}
          tokensB={parseJson<Record<string, unknown>>(langB.fields.tokens)}
          nameA={langA.fields.name ?? "A"}
          nameB={langB.fields.name ?? "B"}
        />
      </div>

      <Separator />

      {/* Embodiment comparison */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Embodiment</h3>
        <div className="grid grid-cols-2 gap-4">
          {sides.map((lang) => (
            <div key={lang.entity_id}>
              {lang.fields.embodiment_file_id ? (
                <EmbodimentViewer fileId={lang.fields.embodiment_file_id} />
              ) : (
                <div className="h-[600px] flex items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                  No embodiment
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TokenDiff({
  tokensA,
  tokensB,
  nameA,
  nameB,
}: {
  tokensA: Record<string, unknown> | null;
  tokensB: Record<string, unknown> | null;
  nameA: string;
  nameB: string;
}) {
  if (!tokensA && !tokensB) {
    return <p className="text-muted-foreground text-sm">No tokens to compare.</p>;
  }

  const allKeys = new Set([
    ...Object.keys(tokensA ?? {}),
    ...Object.keys(tokensB ?? {}),
  ]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2 font-medium">Token</th>
            <th className="text-left p-2 font-medium">{nameA}</th>
            <th className="text-left p-2 font-medium">{nameB}</th>
          </tr>
        </thead>
        <tbody>
          {[...allKeys].sort().map((key) => {
            const a = tokensA?.[key];
            const b = tokensB?.[key];
            const differs = JSON.stringify(a) !== JSON.stringify(b);
            return (
              <tr
                key={key}
                className={differs ? "bg-yellow-50 dark:bg-yellow-950" : ""}
              >
                <td className="p-2 text-muted-foreground">{key}</td>
                <td className="p-2">{formatTokenValue(a)}</td>
                <td className="p-2">{formatTokenValue(b)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatTokenValue(val: unknown): string {
  if (val === undefined || val === null) return "—";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;

  let languages: { entity_id: string; fields: { name?: string } }[] = [];
  try {
    languages = await listDesignLanguages();
  } catch {
    // keep empty
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Side-by-side comparison of two design languages.
        </p>
      </div>

      <CompareSelector
        languages={languages.map((l) => ({
          id: l.entity_id,
          name: l.fields.name ?? l.entity_id,
        }))}
        initialA={sp.a}
        initialB={sp.b}
      />

      {sp.a && sp.b && (
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4">
              <div className="h-80 bg-muted animate-pulse rounded-lg" />
              <div className="h-80 bg-muted animate-pulse rounded-lg" />
            </div>
          }
        >
          <ComparisonView idA={sp.a} idB={sp.b} />
        </Suspense>
      )}

      {(!sp.a || !sp.b) && (
        <div className="text-center py-16 text-muted-foreground">
          Select two design languages above to compare them.
        </div>
      )}
    </div>
  );
}
