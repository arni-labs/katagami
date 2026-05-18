"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  buildShadcnRegistryTheme,
  shadcnComponentSpecMarkdown,
  shadcnCssBlock,
  shadcnInstallCommand,
  shadcnPreviewShotsJson,
  shadcnThemeToJson,
  shadcnVarsToStyle,
} from "@/lib/shadcn-export";

interface ShadcnPreviewProps {
  languageId?: string;
  languageName?: string;
  slug?: string;
  tokensRaw?: string;
  philosophyRaw?: string;
  rulesRaw?: string;
  layoutRaw?: string;
  guidanceRaw?: string;
  className?: string;
  compact?: boolean;
}

type TokenRecord = Record<string, unknown>;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

function parseTokens(tokensRaw?: string): TokenRecord {
  if (!tokensRaw) return {};
  try {
    const parsed = JSON.parse(tokensRaw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function asRecord(value: unknown): TokenRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as TokenRecord)
    : {};
}

function tokenString(
  record: TokenRecord,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function tokenNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function paletteFromTokens(tokens: TokenRecord) {
  const colors = asRecord(tokens.colors);
  const entries = [
    ["primary", tokenString(colors, ["primary", "text", "foreground"], "#111111")],
    ["accent", tokenString(colors, ["accent", "info"], "#2563eb")],
    ["surface", tokenString(colors, ["surface", "card"], "#ffffff")],
    ["muted", tokenString(colors, ["muted", "secondary"], "#f4f4f5")],
    ["warning", tokenString(colors, ["warning"], "#d97706")],
    ["error", tokenString(colors, ["error", "destructive"], "#dc2626")],
  ];
  return entries.filter(([, value], index, self) => {
    return self.findIndex(([, other]) => other.toLowerCase() === value.toLowerCase()) === index;
  });
}

function sampleVars(tokens: TokenRecord) {
  const colors = asRecord(tokens.colors);
  const radii = asRecord(tokens.radii ?? tokens.radius);
  const shadows = asRecord(tokens.shadows);
  const typography = asRecord(tokens.typography);
  const spacing = asRecord(tokens.spacing);
  const surfaces = asRecord(tokens.surfaces);

  return {
    "--sample-accent": tokenString(colors, ["accent", "info", "primary"], "var(--primary)"),
    "--sample-warning": tokenString(colors, ["warning", "secondary"], "var(--secondary)"),
    "--sample-ink": tokenString(colors, ["text", "foreground", "primary"], "var(--foreground)"),
    "--sample-border": tokenString(colors, ["border", "primary"], "var(--border)"),
    "--sample-radius": tokenString(radii, ["lg", "md", "default", "base"], "var(--radius)"),
    "--sample-shadow": tokenString(shadows, ["md", "lg", "sm"], "0 18px 48px rgb(0 0 0 / 0.10)"),
    "--sample-display-font": tokenString(
      typography,
      ["heading_font", "display_font", "display", "heading"],
      "var(--font-display)",
    ),
    "--sample-body-font": tokenString(
      typography,
      ["body_font", "body", "base_font"],
      "var(--font-sans)",
    ),
    "--sample-grid": `${tokenNumber(asRecord(spacing).base, 8)}px`,
    "--sample-surface-note": tokenString(
      surfaces,
      ["card_style", "treatment", "bg_pattern"],
      "Semantic shadcn primitives wearing Katagami variables.",
    ),
  } as CSSProperties;
}

function surfaceNote(tokens: TokenRecord): string {
  const surfaces = asRecord(tokens.surfaces);
  return tokenString(
    surfaces,
    ["card_style", "treatment", "bg_pattern"],
    "Use Katagami guidance first; apply this when the app is shadcn/ui.",
  );
}

function ArtifactBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={async () => {
            await copyText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="max-h-56 overflow-auto p-3 text-[11px] leading-relaxed text-muted-foreground">
        <code>{value}</code>
      </pre>
    </div>
  );
}

function SwatchRail({ tokens }: { tokens: TokenRecord }) {
  const palette = paletteFromTokens(tokens).slice(0, 6);
  return (
    <div className="flex flex-wrap gap-1.5">
      {palette.map(([label, value]) => (
        <span
          key={`${label}-${value}`}
          className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-2 text-[10px] font-medium text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="h-3 w-3 shrink-0 rounded-full border border-foreground/15"
            style={{ background: value }}
          />
          <span className="max-w-20 truncate">{label}</span>
        </span>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warning";
}) {
  return (
    <Card
      size="sm"
      className={
        tone === "accent"
          ? "border border-[color:var(--sample-accent)]/35 bg-accent/10"
          : tone === "warning"
            ? "border border-[color:var(--sample-warning)]/40 bg-secondary/30"
            : "border border-border/70 bg-card/80"
      }
    >
      <CardContent className="pt-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div
          className="mt-1 text-xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--sample-display-font)" }}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentSample({
  languageName,
  tokens,
}: {
  languageName?: string;
  tokens: TokenRecord;
}) {
  const displayName = languageName || "Katagami language";
  const note = surfaceNote(tokens);

  return (
    <div
      className="relative overflow-hidden rounded-[var(--sample-radius)] border border-[color:var(--sample-border)]/35 bg-background p-3 text-foreground shadow-[var(--sample-shadow)]"
      style={{
        backgroundImage:
          "linear-gradient(90deg, color-mix(in oklch, var(--sample-accent) 10%, transparent) 1px, transparent 1px), linear-gradient(0deg, color-mix(in oklch, var(--sample-accent) 8%, transparent) 1px, transparent 1px)",
        backgroundSize: "calc(var(--sample-grid) * 4) calc(var(--sample-grid) * 4)",
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[color:var(--sample-accent)]" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(250px,0.9fr)]">
        <Card className="border border-border/75 bg-card/92 shadow-sm backdrop-blur">
          <CardHeader className="gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Live theme</Badge>
                <Badge variant="outline">registry:theme</Badge>
              </div>
              <CardTitle
                className="text-balance text-2xl leading-none tracking-tight sm:text-3xl"
                style={{ fontFamily: "var(--sample-display-font)" }}
              >
                {displayName}
              </CardTitle>
              <CardDescription className="max-w-xl">
                A shadcn surface using Katagami semantic variables, native color roles, and component states.
              </CardDescription>
            </div>
            <CardAction>
              <Button size="sm">Apply</Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwatchRail tokens={tokens} />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input defaultValue="Language token" aria-label="Sample input" />
                <Select defaultValue="preview">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preview">Preview</SelectItem>
                    <SelectItem value="tokens">Tokens</SelectItem>
                    <SelectItem value="components">Components</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary">Review</Button>
                <Button variant="outline">Export</Button>
              </div>
            </div>
            <Textarea
              defaultValue={note}
              aria-label="Sample textarea"
              className="min-h-20"
            />
          </CardContent>
          <CardFooter className="justify-between gap-3 bg-muted/55">
            <span className="text-xs text-muted-foreground">
              button / card / input / select / tabs / badge / table
            </span>
            <Button size="sm" variant="ghost">Queue</Button>
          </CardFooter>
        </Card>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="radius" value="live" />
            <MetricCard label="ring" value="focus" tone="accent" />
            <MetricCard label="mode" value="dark" tone="warning" />
          </div>

          <Tabs defaultValue="state" className="rounded-[var(--sample-radius)] bg-card/80 p-2 ring-1 ring-border/70 backdrop-blur">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="state">State</TabsTrigger>
              <TabsTrigger value="flow">Flow</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
            </TabsList>
            <TabsContent value="state" className="mt-2">
              <Card size="sm" className="border border-border/70 bg-background/75">
                <CardContent className="flex flex-wrap gap-2 pt-3">
                  <Badge>Active</Badge>
                  <Badge variant="secondary">Synced</Badge>
                  <Badge variant="outline">Draft</Badge>
                  <Badge variant="destructive">Blocked</Badge>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="flow" className="mt-2">
              <Card size="sm" className="border border-border/70 bg-background/75">
                <CardContent className="space-y-3 pt-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>Spec</span>
                    <Badge variant="outline">source</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>Theme</span>
                    <Badge>generated</Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="data" className="mt-2">
              <Card size="sm" className="border border-border/70 bg-background/75">
                <CardContent className="pt-3">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        <th className="py-2 font-medium">Token</th>
                        <th className="py-2 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">primary</td>
                        <td className="py-2 text-muted-foreground">action</td>
                      </tr>
                      <tr>
                        <td className="py-2">surface</td>
                        <td className="py-2 text-muted-foreground">card</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export function ShadcnPreview({
  languageId,
  languageName,
  slug,
  tokensRaw,
  philosophyRaw,
  rulesRaw,
  layoutRaw,
  guidanceRaw,
  className = "",
  compact = false,
}: ShadcnPreviewProps) {
  const theme = useMemo(
    () =>
      buildShadcnRegistryTheme({
        languageId,
        name: languageName,
        slug,
        tokens: tokensRaw,
      }),
    [languageId, languageName, slug, tokensRaw],
  );
  const json = useMemo(() => shadcnThemeToJson(theme), [theme]);
  const css = useMemo(() => shadcnCssBlock(theme), [theme]);
  const componentSpec = useMemo(
    () =>
      shadcnComponentSpecMarkdown({
        languageId,
        name: languageName,
        slug,
        philosophy: philosophyRaw,
        tokens: tokensRaw,
        rules: rulesRaw,
        layout: layoutRaw,
        guidance: guidanceRaw,
      }),
    [
      languageId,
      languageName,
      slug,
      philosophyRaw,
      tokensRaw,
      rulesRaw,
      layoutRaw,
      guidanceRaw,
    ],
  );
  const previewShots = useMemo(
    () =>
      shadcnPreviewShotsJson({
        languageId,
        name: languageName,
        slug,
        philosophy: philosophyRaw,
        rules: rulesRaw,
        guidance: guidanceRaw,
      }),
    [languageId, languageName, slug, philosophyRaw, rulesRaw, guidanceRaw],
  );
  const tokens = useMemo(() => parseTokens(tokensRaw), [tokensRaw]);
  const lightStyle = useMemo(
    () => ({ ...shadcnVarsToStyle(theme.cssVars.light), ...sampleVars(tokens) }),
    [theme, tokens],
  );
  const darkStyle = useMemo(
    () => ({ ...shadcnVarsToStyle(theme.cssVars.dark), ...sampleVars(tokens) }),
    [theme, tokens],
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid gap-4">
        <div
          className="text-foreground"
          style={lightStyle}
        >
          <ComponentSample languageName={languageName} tokens={tokens} />
        </div>
        {!compact && (
          <div
            className="dark text-foreground"
            style={darkStyle}
          >
            <ComponentSample languageName={languageName} tokens={tokens} />
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <ArtifactBlock label="shadcn add" value={shadcnInstallCommand()} />
        <ArtifactBlock label="theme css" value={css} />
        <ArtifactBlock label="registry theme" value={json} />
        <ArtifactBlock label="component recipes" value={componentSpec} />
        <ArtifactBlock label="preview shots" value={previewShots} />
      </div>
    </div>
  );
}
