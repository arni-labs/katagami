import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DesignLanguage } from "@/lib/odata";
import { parseJson } from "@/lib/odata";

const statusColor: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  UnderReview: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function LanguageCard({ lang }: { lang: DesignLanguage }) {
  const f = lang.fields;
  const c = lang.counters;
  const tags = parseJson<string[]>(f.tags) ?? [];
  const lineage = f.lineage_type ?? "original";
  const slug = f.slug || lang.entity_id;
  const elementCount = c.element_count ?? (parseInt(f.element_count ?? "0", 10) || 0);

  return (
    <Link href={`/language/${lang.entity_id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {f.name || "Untitled"}
            </CardTitle>
            <Badge variant="secondary" className={statusColor[lang.status] ?? ""}>
              {lang.status}
            </Badge>
          </div>
          <CardDescription className="text-xs font-mono">
            {slug}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">
              {lineage}
            </Badge>
            {lineage !== "original" && (
              <Badge variant="outline" className="text-[10px]">
                gen {f.generation_number ?? "?"}
              </Badge>
            )}
            {elementCount > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {elementCount} elements
              </Badge>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 5).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-3 text-xs text-muted-foreground pt-1">
            <span>v{c.version ?? 0}</span>
            <span>{c.usage_count ?? 0} uses</span>
            <span>{c.fork_count ?? 0} forks</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
