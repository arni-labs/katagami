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

function JsonBlock({ raw }: { raw?: string }) {
  const parsed = parseJson(raw);
  if (!parsed) {
    return (
      <p className="text-sm text-muted-foreground italic">Not set</p>
    );
  }
  return (
    <ScrollArea className="h-[400px]">
      <pre className="text-xs font-mono whitespace-pre-wrap p-4 bg-muted rounded-md">
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </ScrollArea>
  );
}

export function SpecPanel({ philosophy, tokens, rules, layout, guidance }: SpecPanelProps) {
  const sections = [
    { key: "philosophy", label: "Philosophy", raw: philosophy },
    { key: "tokens", label: "Tokens", raw: tokens },
    { key: "rules", label: "Rules", raw: rules },
    { key: "layout", label: "Layout", raw: layout },
    { key: "guidance", label: "Guidance", raw: guidance },
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
          <JsonBlock raw={s.raw} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
