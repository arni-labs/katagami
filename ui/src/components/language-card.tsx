"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DesignLanguage } from "@/lib/odata";
import { parseJson, getFileUrl } from "@/lib/odata";
import { DeleteLanguageButton } from "@/components/delete-language-button";

const statusColor: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  UnderReview: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Published: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Archived: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface TokenColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  [key: string]: string | undefined;
}

interface Tokens {
  colors?: TokenColors;
  typography?: {
    heading_font?: string;
    body_font?: string;
    [key: string]: string | number | undefined;
  };
}

interface Philosophy {
  summary?: string;
  [key: string]: unknown;
}

export function LanguageCard({ lang }: { lang: DesignLanguage }) {
  const f = lang.fields;
  const c = lang.counters;
  const tags = parseJson<string[]>(f.tags) ?? [];
  const lineage = f.lineage_type ?? "original";
  const slug = f.slug || lang.entity_id;
  const elementCount = c.element_count ?? (parseInt(f.element_count ?? "0", 10) || 0);
  const hasNotes = !!f.curator_notes;

  const tokens = parseJson<Tokens>(f.tokens);
  const philosophy = parseJson<Philosophy>(f.philosophy);

  const palette = tokens?.colors
    ? [
        tokens.colors.primary,
        tokens.colors.secondary,
        tokens.colors.accent,
        tokens.colors.background,
        tokens.colors.surface,
      ].filter((c): c is string => !!c)
    : [];

  const headingFont = tokens?.typography?.heading_font;
  const bodyFont = tokens?.typography?.body_font;
  const summary = philosophy?.summary;
  const embodimentFileId = f.embodiment_file_id;

  return (
    <Link href={`/language/${lang.entity_id}`} className="group relative block">
      <DeleteLanguageButton
        id={lang.entity_id}
        name={f.name || "Untitled"}
        variant="icon"
      />
      <Card className="h-full transition-shadow hover:shadow-md overflow-hidden">
        {/* Embodiment preview */}
        {embodimentFileId && (
          <div className="relative w-full h-36 overflow-hidden bg-muted border-b">
            <iframe
              src={getFileUrl(embodimentFileId)}
              className="absolute top-0 left-0 w-[1200px] h-[800px] pointer-events-none border-0"
              style={{
                transform: "scale(0.15)",
                transformOrigin: "top left",
              }}
              tabIndex={-1}
              loading="lazy"
              sandbox=""
              title={`${f.name} preview`}
            />
          </div>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {f.name || "Untitled"}
            </CardTitle>
            <div className="flex items-center gap-1">
              {hasNotes && (
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <Badge variant="secondary" className={statusColor[lang.status] ?? ""}>
                {lang.status}
              </Badge>
            </div>
          </div>
          {summary && (
            <CardDescription className="text-xs line-clamp-2">
              {summary}
            </CardDescription>
          )}
          {!summary && (
            <CardDescription className="text-xs font-mono">
              {slug}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Color palette swatches */}
          {palette.length > 0 && (
            <div className="flex gap-1.5 items-center">
              {palette.map((color, i) => (
                <span
                  key={i}
                  className="w-5 h-5 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          )}

          {/* Font preview */}
          {(headingFont || bodyFont) && (
            <div className="text-[10px] text-muted-foreground truncate">
              {headingFont && <span className="font-medium">{headingFont}</span>}
              {headingFont && bodyFont && <span className="mx-1">/</span>}
              {bodyFont && <span>{bodyFont}</span>}
            </div>
          )}

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
