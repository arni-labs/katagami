import { parseJson } from "@/lib/odata";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SpecPanelProps {
  philosophy?: string;
  tokens?: string;
  rules?: string;
  layout?: string;
  guidance?: string;
}

function PhilosophyView({ raw }: { raw?: string }) {
  const data = parseJson<Record<string, unknown>>(raw);
  if (!data) return <Empty />;

  const values = (data.values as string[]) ?? [];
  const antiValues = (data.anti_values as string[]) ?? [];
  const lineage = (data.lineage as string) ?? "";

  return (
    <div className="space-y-4 p-4">
      {values.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Values</h4>
          <div className="flex flex-wrap gap-2">
            {values.map((v) => (
              <span key={v} className="rounded-full bg-green-50 border border-green-200 px-3 py-1 text-sm text-green-800">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
      {antiValues.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Anti-values</h4>
          <div className="flex flex-wrap gap-2">
            {antiValues.map((v) => (
              <span key={v} className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-sm text-red-800">
                {v}
              </span>
            ))}
          </div>
        </div>
      )}
      {lineage && (
        <div>
          <h4 className="text-sm font-medium mb-1">Lineage</h4>
          <p className="text-sm text-muted-foreground">{lineage}</p>
        </div>
      )}
    </div>
  );
}

function TokensView({ raw }: { raw?: string }) {
  const data = parseJson<Record<string, Record<string, unknown>>>(raw);
  if (!data) return <Empty />;

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-6 p-4">
        {Object.entries(data).map(([group, values]) => (
          <div key={group}>
            <h4 className="text-sm font-medium capitalize mb-2">{group}</h4>
            <div className="grid gap-1">
              {typeof values === "object" && values !== null ? (
                Object.entries(values as Record<string, unknown>).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3 text-sm py-1">
                    <span className="text-muted-foreground w-32 shrink-0 font-mono text-xs">{key}</span>
                    <div className="flex items-center gap-2">
                      {group === "colors" && typeof val === "string" && val.startsWith("#") && (
                        <span className="w-4 h-4 rounded border" style={{ backgroundColor: val }} />
                      )}
                      <span className="font-mono text-xs">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-xs font-mono">{JSON.stringify(values)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function KeyValueView({ raw }: { raw?: string }) {
  const data = parseJson<Record<string, unknown>>(raw);
  if (!data) return <Empty />;

  // Check if it has "do" and "dont" keys (guidance pattern)
  if ("do" in data || "dont" in data) {
    const dos = (data.do as string[]) ?? [];
    const donts = (data.dont as string[]) ?? [];
    return (
      <div className="space-y-4 p-4">
        {dos.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-green-700 mb-2">Do</h4>
            <ul className="space-y-1">
              {dos.map((d) => (
                <li key={d} className="text-sm flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">+</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
        {donts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-2">Don&apos;t</h4>
            <ul className="space-y-1">
              {donts.map((d) => (
                <li key={d} className="text-sm flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">-</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex items-start gap-3 text-sm py-1">
          <span className="text-muted-foreground w-32 shrink-0 capitalize">{key.replace(/_/g, " ")}</span>
          <span className="text-sm">
            {typeof val === "object" ? JSON.stringify(val) : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground italic p-4">Not set</p>;
}

export function SpecPanel({ philosophy, tokens, rules, layout, guidance }: SpecPanelProps) {
  const sections = [
    { key: "philosophy", label: "Philosophy", content: <PhilosophyView raw={philosophy} /> },
    { key: "tokens", label: "Tokens", content: <TokensView raw={tokens} /> },
    { key: "rules", label: "Rules", content: <KeyValueView raw={rules} /> },
    { key: "layout", label: "Layout", content: <KeyValueView raw={layout} /> },
    { key: "guidance", label: "Guidance", content: <KeyValueView raw={guidance} /> },
  ];

  return (
    <Tabs defaultValue="philosophy">
      <TabsList>
        {sections.map((s) => (
          <TabsTrigger key={s.key} value={s.key}>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((s) => (
        <TabsContent key={s.key} value={s.key}>
          <div className="rounded-md border bg-card">
            {s.content}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
