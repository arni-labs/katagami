"use client";

import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildShadcnRegistryTheme,
  isAgentAuthoredShadcnComponentSpec,
  isAgentAuthoredShadcnPreviewShots,
  isRenderableShadcnPreviewShots,
  shadcnComponentSpecMarkdown,
  shadcnCssBlock,
  shadcnExampleTsx,
  shadcnInstallCommand,
  shadcnPreviewShotsJson,
  shadcnThemeToJson,
  shadcnVarsToStyle,
} from "@/lib/shadcn-export";
import type { ShadcnPreviewShots } from "@/lib/shadcn-export";
import { cn } from "@/lib/utils";

interface ShadcnPreviewProps {
  languageId?: string;
  languageName?: string;
  slug?: string;
  tokensRaw?: string;
  philosophyRaw?: string;
  rulesRaw?: string;
  layoutRaw?: string;
  guidanceRaw?: string;
  storedThemeJson?: string | null;
  storedComponentSpec?: string | null;
  storedPreviewShots?: string | null;
  shadcnDesignMd?: string | null;
  themeStatus?: "validated" | "stored-unverified" | "generated-preview";
  componentSpecStatus?: "validated" | "stored-unverified" | "generated-preview";
  previewShotsStatus?: "validated" | "stored-unverified" | "generated-preview";
  className?: string;
  compact?: boolean;
}

type TokenRecord = Record<string, unknown>;
type Shot = ShadcnPreviewShots["shots"][number];
type ArtifactStatus = NonNullable<ShadcnPreviewProps["previewShotsStatus"]>;
type SceneListItem = {
  label: string;
  value: string;
  status?: string;
  tone?: "default" | "accent" | "warning";
};
type ShadSyncVisualProfile = {
  family: "paper-collage" | "editorial" | "brutalist" | "minimal" | "system";
  material: "paper" | "glass" | "ink" | "flat";
  contour: "blob" | "pebble" | "rectangular" | "default";
  border: "dashed" | "solid" | "none";
  underlay: boolean;
  grain: boolean;
  stickerBadges: boolean;
  motion: "lift-rotate" | "lift" | "still";
  density: "airy" | "balanced" | "dense";
  accents: string[];
};
type ShadSyncPreviewArtifact = ShadcnPreviewShots & {
  visualProfile?: Partial<ShadSyncVisualProfile> & Record<string, unknown>;
};

const SHOT_PRIMITIVE_FALLBACKS: Record<string, string[]> = {
  "application-shell": ["button", "card", "input", "select", "tabs", "badge", "separator", "table"],
  "detail-editor": ["button", "card", "input", "textarea", "select", "checkbox", "switch", "slider"],
  "data-operations": ["button", "tabs", "badge", "dropdown-menu", "table", "tooltip", "separator"],
};

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

function parsePreviewShots(raw: string): ShadSyncPreviewArtifact | null {
  try {
    const parsed = JSON.parse(raw);
    if (isRenderableShadcnPreviewShots(parsed)) {
      return parsed as ShadSyncPreviewArtifact;
    }
  } catch {
    return null;
  }
  return null;
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

function fontStackForToken(value: string, fallback: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("instrument serif")) {
    return 'var(--font-dew-display), "Instrument Serif", Georgia, serif';
  }
  if (normalized.includes("ibm plex sans")) {
    return 'var(--font-dew-sans), "IBM Plex Sans", system-ui, sans-serif';
  }
  if (normalized.includes("ibm plex mono")) {
    return 'var(--font-dew-mono), "IBM Plex Mono", ui-monospace, monospace';
  }
  if (value.startsWith("var(") || value.includes(",")) return value;
  return `${value}, ${fallback}`;
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
    "--sample-display-font": fontStackForToken(
      tokenString(
        typography,
        ["heading_font", "display_font", "display", "heading"],
        "var(--font-display)",
      ),
      "var(--font-display), serif",
    ),
    "--sample-body-font": fontStackForToken(
      tokenString(
        typography,
        ["body_font", "body", "base_font"],
        "var(--font-sans)",
      ),
      "var(--font-sans), system-ui, sans-serif",
    ),
    "--sample-mono-font": fontStackForToken(
      tokenString(
        typography,
        ["mono_font", "mono", "code_font"],
        "var(--font-geist-mono)",
      ),
      "var(--font-geist-mono), ui-monospace, monospace",
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

function profileKeyword(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function visualProfileFromArtifact(
  artifact: ShadSyncPreviewArtifact,
  tokens: TokenRecord,
  componentSpec?: string,
): ShadSyncVisualProfile {
  const explicit = asRecord(artifact.visualProfile);
  const profileText = [
    JSON.stringify(explicit),
    componentSpec ?? "",
    JSON.stringify(artifact.identityNotes ?? []),
    JSON.stringify(artifact.componentRecipes ?? []),
    JSON.stringify(asRecord(tokens.surfaces)),
    JSON.stringify(asRecord(tokens.borders)),
    JSON.stringify(asRecord(tokens.motion)),
  ]
    .join(" ")
    .toLowerCase();
  const isPaper = profileKeyword(profileText, [
    "paper",
    "collage",
    "washi",
    "sticker",
    "scrap",
    "torn",
    "grain",
    "storybook",
  ]);
  const isBrutalist = profileKeyword(profileText, ["brutalist", "industrial", "terminal", "mechanical"]);
  const isEditorial = profileKeyword(profileText, ["editorial", "magazine", "serif", "folio"]);
  const contourText = String(explicit.contour ?? explicit.shape ?? "").toLowerCase();
  const familyText = String(explicit.family ?? "").toLowerCase();
  const materialText = String(explicit.material ?? "").toLowerCase();
  // An explicit visualProfile wins over keyword-sniffing the prose. A language that
  // declares its family/material must not be re-tagged "paper-collage" just because
  // its imagery copy mentions "grain" — only infer from keywords when unspecified.
  const hasExplicitFamily = familyText.trim().length > 0;
  const family: ShadSyncVisualProfile["family"] = familyText.includes("paper") || familyText.includes("collage")
    ? "paper-collage"
    : familyText.includes("brut") || familyText.includes("industrial")
      ? "brutalist"
      : familyText.includes("editor") || familyText.includes("magazine") || familyText.includes("folio")
        ? "editorial"
        : familyText.includes("minimal") || familyText.includes("quiet") || familyText.includes("plain")
          ? "minimal"
          : hasExplicitFamily
            ? "system"
            : isPaper
              ? "paper-collage"
              : isBrutalist
                ? "brutalist"
                : isEditorial
                  ? "editorial"
                  : profileKeyword(profileText, ["minimal", "quiet", "plain"])
                    ? "minimal"
                    : "system";

  return {
    family,
    material: materialText.includes("paper")
      ? "paper"
      : materialText.includes("glass")
        ? "glass"
        : materialText.includes("ink")
          ? "ink"
          : materialText.includes("flat")
            ? "flat"
            : isPaper
              ? "paper"
              : isBrutalist
                ? "ink"
                : "flat",
    // An explicit contour wins over prose-sniffing. A language that declares contour:"default"
    // must not become "pebble" just because the word "pill" appears in its copy (which would
    // stamp a 42% blob on icon chips). Only infer from prose when contour is unspecified.
    contour:
      contourText === "default"
        ? "default"
        : contourText.includes("blob") || (!contourText && profileKeyword(profileText, ["blob", "scallop", "irregular"]))
          ? "blob"
          : contourText.includes("pebble") || (!contourText && profileKeyword(profileText, ["pebble", "pill"]))
            ? "pebble"
            : contourText.includes("rect")
              ? "rectangular"
              : "default",
    // An explicit border declaration wins over prose-sniffing: a language that says
    // border:"none" must render borderless, not fall through to "solid".
    border:
      String(explicit.border ?? "").toLowerCase() === "none"
        ? "none"
        : String(explicit.border ?? "").toLowerCase().includes("dash") ||
            profileKeyword(profileText, ["dashed", "hand-drawn", "pencil", "stitched"])
          ? "dashed"
          : String(explicit.border ?? "").toLowerCase() === "solid"
            ? "solid"
            : profileKeyword(profileText, ["borderless", "no border", "no borders", "none"])
              ? "none"
              : "solid",
    underlay:
      typeof explicit.underlay === "boolean"
        ? explicit.underlay
        : profileKeyword(profileText, ["underlay", "offset", "layered", "shadow patch"]),
    grain:
      typeof explicit.grain === "boolean"
        ? explicit.grain
        : profileKeyword(profileText, ["grain", "texture", "paper", "washi"]),
    stickerBadges:
      typeof explicit.stickerBadges === "boolean"
        ? explicit.stickerBadges
        : profileKeyword(profileText, ["sticker", "stamp", "ribbon", "label chip", "badge"]),
    motion: profileKeyword(profileText, ["rotate", "tilt", "one degree"])
      ? "lift-rotate"
      : profileKeyword(profileText, ["lift", "spring", "hop"])
        ? "lift"
        : "still",
    density: profileKeyword(profileText, ["dense", "compact", "ledger"])
      ? "dense"
      : profileKeyword(profileText, ["airy", "roomy", "wide gutter"])
        ? "airy"
        : "balanced",
    accents: listFromUnknown(explicit.accents).slice(0, 4),
  };
}

function shadSyncVars(profile: ShadSyncVisualProfile, tokens: TokenRecord): CSSProperties {
  const colors = asRecord(tokens.colors);
  const radii = asRecord(tokens.radii ?? tokens.radius);
  const shadows = asRecord(tokens.shadows);
  const background = tokenString(colors, ["background", "bg"], "var(--background)");
  const surface = tokenString(colors, ["surface", "card"], "var(--card)");
  const ink = tokenString(colors, ["text", "foreground", "ink", "primary"], "var(--foreground)");
  const primary = tokenString(colors, ["primary", "accent"], "var(--primary)");
  const accent = tokenString(colors, ["accent", "info"], "var(--accent)");
  const secondary = tokenString(colors, ["secondary", "warning"], "var(--secondary)");
  const border = tokenString(colors, ["border", "outline"], "var(--border)");
  const radius = tokenString(radii, ["lg", "md", "default", "base"], "var(--sample-radius)");
  // controls follow the language's card radius (md), never forced square at sm:0 — a
  // genuinely sharp language expresses that in its tokens (md/lg = 0), not via the renderer.
  const controlRadius = tokenString(radii, ["md", "default", "base", "lg"], radius);
  const chipRadius = tokenString(radii, ["full", "pill"], "999px");
  return {
    "--shadsync-bg": background,
    "--shadsync-surface": surface,
    "--shadsync-paper": profile.material === "paper" ? surface : background,
    "--shadsync-ink": ink,
    "--shadsync-primary": primary,
    "--shadsync-accent": accent,
    "--shadsync-secondary": secondary,
    "--shadsync-muted": tokenString(colors, ["muted", "secondary"], "var(--muted)"),
    "--shadsync-outline": border,
    "--shadsync-radius": radius,
    "--shadsync-card-radius": radius,
    "--shadsync-control-radius": controlRadius,
    "--shadsync-chip-radius": chipRadius,
    // Drive shadcn's own radius scale from the language so the REAL primitives rendered in
    // the deck (Card, Checkbox, Badge, Slider…) honor it — a sharp language gets sharp
    // primitives, not the app default 6px. The derived --radius-* are resolved at :root, so
    // overriding only --radius is not enough; pin the whole scale to the language radius.
    "--radius": controlRadius,
    "--radius-sm": controlRadius,
    "--radius-md": controlRadius,
    "--radius-lg": controlRadius,
    "--radius-xl": controlRadius,
    "--shadsync-underlay-a": accent,
    "--shadsync-underlay-b": secondary,
    "--shadsync-shadow": tokenString(
      shadows,
      ["lg", "md"],
      "0 16px 36px rgb(48 64 59 / 0.14), 0 2px 0 rgb(48 64 59 / 0.08)",
    ),
    // A no-border language must not inherit a hard --border (e.g. #000000) onto the raw
    // shadcn primitives (Input, Tabs, Separator) — keep them borderless like the language.
    ...(profile.border === "none"
      ? { "--border": "transparent", "--input": "transparent", "--shadsync-outline": "transparent" }
      : {}),
  } as CSSProperties;
}

function listFromUnknown(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function nonemptyText(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function recordText(record: TokenRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = nonemptyText(record[key]);
    if (value) return value;
  }
  return undefined;
}

function sceneTone(value: unknown): SceneListItem["tone"] {
  const tone = nonemptyText(value)?.toLowerCase();
  if (!tone) return "default";
  if (
    tone.includes("warn") ||
    tone.includes("repair") ||
    tone.includes("berry") ||
    tone.includes("apricot")
  ) {
    return "warning";
  }
  if (
    tone.includes("accent") ||
    tone.includes("primary") ||
    tone.includes("moss") ||
    tone.includes("sky")
  ) {
    return "accent";
  }
  return "default";
}

function sceneItemKey(prefix: string, item: SceneListItem, index: number): string {
  return `${prefix}-${index}-${item.label}-${item.value}-${item.status ?? ""}`;
}

function normalizeSceneItems(
  value: unknown,
  fallback: SceneListItem[],
  options: {
    labelKeys?: string[];
    valueKeys?: string[];
    statusKeys?: string[];
  } = {},
): SceneListItem[] {
  if (!Array.isArray(value)) return fallback;
  const labelKeys = options.labelKeys ?? [
    "label",
    "title",
    "name",
    "station",
    "kit",
    "prompt",
    "check",
    "field",
    "metric",
    "component",
  ];
  const valueKeys = options.valueKeys ?? [
    "value",
    "detail",
    "description",
    "next",
    "draft",
    "due",
    "owner",
    "room",
    "state",
  ];
  const statusKeys = options.statusKeys ?? ["status", "state", "tone"];
  const normalized = value
    .map((item, index): SceneListItem | null => {
      if (typeof item === "string" && item.trim()) {
        return {
          label: item.trim(),
          value: fallback[index]?.value ?? "",
          status: fallback[index]?.status,
          tone: fallback[index]?.tone ?? "default",
        };
      }
      const record = asRecord(item);
      if (Object.keys(record).length === 0) return null;
      const fallbackItem = fallback[index] ?? {
        label: `Item ${index + 1}`,
        value: "",
      };
      const label = recordText(record, labelKeys) ?? fallbackItem.label;
      const value = recordText(record, valueKeys) ?? fallbackItem.value;
      const status = recordText(record, statusKeys) ?? fallbackItem.status;
      return {
        label,
        value,
        status,
        tone: sceneTone(record.tone ?? fallbackItem.tone),
      };
    })
    .filter((item): item is SceneListItem => Boolean(item));
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeStatuses(value: unknown, fallback: string[], rows?: SceneListItem[]): string[] {
  const explicit = listFromUnknown(value);
  if (explicit.length > 0) return explicit;
  const rowStatuses = Array.from(
    new Set((rows ?? []).map((row) => row.status).filter((status): status is string => Boolean(status))),
  );
  return rowStatuses.length > 0 ? rowStatuses : fallback;
}

function statusLabel(status: ArtifactStatus): string {
  if (status === "validated") return "stored + verified";
  if (status === "stored-unverified") return "stored";
  return "compatibility fallback";
}

function isAgentAuthoredArtifact(artifact: ShadSyncPreviewArtifact | null): boolean {
  return isAgentAuthoredShadcnPreviewShots(artifact);
}

function copyTestId(label: string): string {
  return `copy-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function ArtifactStatusBadge({
  status,
}: {
  status: ArtifactStatus;
}) {
  return (
    <Badge
      variant={status === "generated-preview" ? "outline" : "secondary"}
      className="h-5 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]"
      data-testid={`artifact-status-${status}`}
    >
      {statusLabel(status)}
    </Badge>
  );
}

function ArtPanel({
  children,
  className,
  tone = "surface",
}: {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "accent" | "secondary" | "plain";
}) {
  return (
    <div className={cn("shadsync-panel-shell", className)} data-tone={tone}>
      {children}
    </div>
  );
}

function artButtonClass(variant: "primary" | "secondary" | "outline" | "icon" = "primary"): string {
  return cn(
    "shadsync-control shadsync-button",
    variant === "secondary" && "shadsync-button-secondary",
    variant === "outline" && "shadsync-button-outline",
    variant === "icon" && "shadsync-button-icon",
  );
}

const artFieldClass = "shadsync-control shadsync-field";
const artCardClass = "shadsync-card border-0 bg-[var(--shadsync-surface)] shadow-none";

function ArtifactBlock({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: ArtifactStatus;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden bg-card shadow-[var(--shadow-paper)]">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
          {status ? <ArtifactStatusBadge status={status} /> : null}
        </div>
        <button
          type="button"
          data-testid={copyTestId(label)}
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

function ShadcnKitCopyPanel({
  value,
  hasAgentKit,
  themeStatus,
  componentSpecStatus,
  previewShotsStatus,
}: {
  value: string;
  hasAgentKit: boolean;
  themeStatus: ArtifactStatus;
  componentSpecStatus: ArtifactStatus;
  previewShotsStatus: ArtifactStatus;
}) {
  const [copied, setCopied] = useState(false);
  const allValidated =
    themeStatus === "validated" &&
    componentSpecStatus === "validated" &&
    previewShotsStatus === "validated";

  return (
    <div className="bg-card/95 p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className="h-5 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]">
              recommended
            </Badge>
            <Badge
              variant={hasAgentKit ? "secondary" : "outline"}
              className="h-5 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]"
            >
              {hasAgentKit ? "agent kit included" : "compatibility fallback"}
            </Badge>
            {allValidated ? (
              <Badge
                variant="outline"
                className="h-5 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]"
              >
                verified
              </Badge>
            ) : null}
          </div>
          <h3 className="text-sm font-semibold text-foreground">DESIGN.md with shadcn</h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Copy this when the target app uses shadcn/ui. It packages the Katagami DESIGN.md context with the install list,
            theme variables, component recipes, preview-shot contract, and starter TSX in one Markdown companion.
          </p>
        </div>
        <button
          type="button"
          data-testid={copyTestId("DESIGN.md with shadcn")}
          onClick={async () => {
            await copyText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-foreground bg-foreground px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-background transition-transform hover:-translate-y-0.5"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
  );
}

function ImplementationKitNotice({
  hasAgentKit,
  componentSpecStatus,
  previewShotsStatus,
}: {
  hasAgentKit: boolean;
  componentSpecStatus: ArtifactStatus;
  previewShotsStatus: ArtifactStatus;
}) {
  return (
    <Card
      className={cn(
        "shadsync-kit-notice border-0 ring-0 bg-card/95 shadow-[var(--shadow-card)]",
        hasAgentKit ? "shadsync-kit-ready" : "shadsync-kit-missing",
      )}
      data-testid="shadcn-implementation-kit-status"
      data-shadcn-agent-kit={hasAgentKit ? "ready" : "missing"}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="shadsync-status">
            {hasAgentKit ? "agent-authored kit" : "needs agent-authored kit"}
          </Badge>
          {componentSpecStatus === previewShotsStatus ? (
            <ArtifactStatusBadge status={componentSpecStatus} />
          ) : (
            <>
              <Badge variant="outline" className="h-5 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]">
                recipes {statusLabel(componentSpecStatus)}
              </Badge>
              <Badge variant="outline" className="h-5 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]">
                shots {statusLabel(previewShotsStatus)}
              </Badge>
            </>
          )}
        </div>
        <div>
          <CardTitle>
            {hasAgentKit ? "shadcn implementation kit" : "shadcn compatibility only"}
          </CardTitle>
          <CardDescription>
            {hasAgentKit
              ? "These scenes and recipes came from the Katagami review agent and can be copied as the shadcn implementation layer."
              : "The generated theme variables are available, but the polished shadcn component recipes and shots have not been authored by the Katagami agent yet."}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function CompatibilityCheckPanel({ tokens }: { tokens: TokenRecord }) {
  return (
    <div className="shadsync-compatibility-panel" data-testid="shadcn-compatibility-panel">
      <Card className={cn(artCardClass, "border border-border/70 bg-card")}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="shadsync-chip">
              fallback
            </Badge>
            <Badge variant="secondary" className="shadsync-status">
              primitives render
            </Badge>
          </div>
          <div>
            <CardTitle>Compatibility proof</CardTitle>
            <CardDescription>
              Local shadcn-style primitives accept the generated theme variables.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Primary</Button>
              <Button size="sm" variant="secondary">
                Secondary
              </Button>
              <Button size="sm" variant="outline">
                Outline
              </Button>
              <Button size="sm" variant="destructive">
                Destructive
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input defaultValue="Tokenized input" aria-label="Compatibility input" />
              <Select defaultValue="ready">
                <SelectTrigger aria-label="Compatibility select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs defaultValue="buttons">
              <TabsList>
                <TabsTrigger value="buttons">Buttons</TabsTrigger>
                <TabsTrigger value="forms">Forms</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-3">
            <SwatchRail tokens={tokens} />
            <div className="rounded-md border border-border/70 p-3">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                table rhythm
              </div>
              <Table className="shadsync-table">
                <TableBody>
                  {["button", "card", "input"].map((primitive) => (
                    <TableRow key={primitive}>
                      <TableCell className="font-medium">{primitive}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="shadsync-chip">
                          ok
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
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
          className="shadsync-chip inline-flex h-7 min-w-0 items-center gap-1.5 px-2 text-[10px] font-medium"
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
    <ArtPanel tone={tone === "accent" ? "accent" : tone === "warning" ? "secondary" : "surface"}>
      <Card
        size="sm"
        className={cn(artCardClass, "shadsync-metric")}
        data-metric-tone={tone}
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
    </ArtPanel>
  );
}

function shotPrimitives(shot: Shot): string[] {
  const maybePrimitives = (shot as Shot & { primitives?: unknown; components?: unknown }).primitives;
  const maybeComponents = (shot as Shot & { components?: unknown }).components;
  const explicit = listFromUnknown(maybePrimitives);
  if (explicit.length > 0) return explicit;
  const components = listFromUnknown(maybeComponents);
  if (components.length > 0) return components;
  return SHOT_PRIMITIVE_FALLBACKS[shot.id] ?? ["button", "card", "input", "tabs", "badge"];
}

function PrimitiveRail({ shot }: { shot: Shot }) {
  const primitives = shotPrimitives(shot);
  return (
    <div className="flex flex-wrap gap-1.5">
      {primitives.slice(0, 8).map((primitive) => (
        <Badge key={primitive} variant="outline" className="shadsync-chip h-5 text-[10px]">
          {primitive}
        </Badge>
      ))}
    </div>
  );
}

function SceneBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const tone =
    lower.includes("block") || lower.includes("invalid") || lower.includes("error")
      ? "destructive"
      : lower.includes("draft") || lower.includes("watch") || lower.includes("queued") || lower.includes("review")
        ? "warning"
        : lower.includes("ok") || lower.includes("done") || lower.includes("synced") || lower.includes("ready") || lower.includes("valid")
          ? "success"
          : "neutral";
  const variant =
    tone === "destructive"
      ? "destructive"
      : tone === "warning"
        ? "secondary"
        : tone === "success"
          ? "default"
          : "outline";
  return (
    <Badge
      variant={variant}
      className="shadsync-status h-5 rounded-md"
      data-shadsync-status-tone={tone}
    >
      {status}
    </Badge>
  );
}

function ShotNotes({ shot }: { shot: Shot }) {
  const mustShow = listFromUnknown(shot.mustShow).slice(0, 3);
  const avoid = listFromUnknown(shot.avoid).slice(0, 2);
  return (
    <div className="shadsync-notes grid gap-2 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2">
      <div className="space-y-1.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
          Must show
        </div>
        {mustShow.map((item) => (
          <div key={item} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
          Avoid
        </div>
        {avoid.map((item) => (
          <div key={item} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isDewCandyLanguage(name?: string): boolean {
  return /dew\s+candy/i.test(name ?? "");
}

function DewCandyAppScene({
  shot,
  tokens,
  displayName,
}: {
  shot: Shot;
  tokens: TokenRecord;
  displayName: string;
}) {
  const scene = shot.scene ?? {};
  const rows = normalizeSceneItems(scene.rows, [
    { label: "Mint tray tokens", value: "mapped", status: "Synced" },
    { label: "Cantaloupe accents", value: "8% visible area", status: "Ready" },
    { label: "Wet-edge focus", value: "keyboard proof", status: "Review" },
  ]);
  const stats = normalizeSceneItems(scene.stats, [
    { label: "components", value: "16", tone: "accent" },
    { label: "states", value: "9", tone: "default" },
    { label: "contrast", value: "AA", tone: "warning" },
  ]);

  return (
    <div className="dew-scene space-y-4">
      <div className="dew-scene-kicker">
        <SceneBadge status={scene.eyebrow || "workspace"} />
        <Badge variant="outline" className="shadsync-chip h-5">app shell</Badge>
      </div>
      <div className="space-y-4">
        <div className="dew-panel dew-topbar">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shadsync-icon-chip flex h-8 w-8 shrink-0 items-center justify-center">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">{displayName}</div>
              <div className="text-[11px] text-muted-foreground">component tasting room</div>
            </div>
          </div>
          <div className="dew-nav-strip">
            {["Batch", "Components", "States", "Exports"].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "dew-nav-row",
                  index === 1 ? "is-active" : "text-muted-foreground",
                )}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <section className="dew-panel dew-hero p-5">
          <div className="dew-hero-grid">
            <div className="min-w-0 space-y-3">
              <Badge className="shadsync-status h-5">morning batch</Badge>
              <h4
                className="text-balance text-3xl font-semibold leading-none"
                style={{ fontFamily: "var(--sample-display-font)" }}
              >
                {scene.headline || "Quiet component tasting room"}
              </h4>
              <p className="max-w-[32rem] text-sm leading-relaxed text-muted-foreground">
                {scene.description ||
                  "A calm workspace proving that frosted shadcn primitives can feel soft, useful, and specific."}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="secondary" className={artButtonClass("secondary")}>
                  {scene.secondaryAction || "Compare"}
                </Button>
                <Button size="sm" className={artButtonClass("primary")}>
                  {scene.primaryAction || "Apply"}
                </Button>
              </div>
            </div>
            <div className="dew-score-card">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                live proof
              </div>
              {stats.slice(0, 3).map((stat, index) => (
                <div key={sceneItemKey("dew-stat", stat, index)} className="dew-stat">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {stat.label}
                  </div>
                  <div
                    className="mt-1 text-2xl font-semibold leading-none"
                    style={{ fontFamily: "var(--sample-display-font)" }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className={cn(artCardClass, "dew-panel dew-table-card")}>
          <CardHeader className="gap-3">
            <div>
              <CardTitle>Surface review</CardTitle>
              <CardDescription>Token choices shown as working component states.</CardDescription>
            </div>
            <CardAction>
              <div className="flex gap-2">
                <Input className={cn(artFieldClass, "h-8 w-32")} defaultValue="wet edge" aria-label="Search surfaces" />
                <Select defaultValue="ready">
                  <SelectTrigger className={cn(artFieldClass, "h-8 w-24")} aria-label="Surface state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            <SwatchRail tokens={tokens} />
            <Table className="shadsync-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Layer</TableHead>
                  <TableHead>Use</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 3).map((row, index) => (
                  <TableRow key={sceneItemKey("dew-row", row, index)}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-muted-foreground">{row.value}</TableCell>
                    <TableCell><SceneBadge status={row.status || "Ready"} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DewCandyEditorScene({
  shot,
  tokens,
}: {
  shot: Shot;
  tokens: TokenRecord;
}) {
  const scene = shot.scene ?? {};
  const fields = normalizeSceneItems(scene.fields, [
    { label: "Tray style", value: "Frosted white / 24px" },
    { label: "Focus style", value: "Mint wet-edge ring" },
    { label: "Accent budget", value: "Cantaloupe under 10%" },
  ]);

  return (
    <div className="dew-scene space-y-4">
      <div className="dew-scene-kicker">
        <SceneBadge status={scene.eyebrow || "editor"} />
        <Badge variant="outline" className="shadsync-chip h-5">form system</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_190px]">
        <Card className={cn(artCardClass, "dew-panel dew-editor-card")}>
          <CardHeader>
            <CardTitle>{scene.headline || "Recipe editor"}</CardTitle>
            <CardDescription>
              {scene.description || "A soft form with visible labels, validation, toggles, and confident actions."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Component family
                <Input className={artFieldClass} defaultValue={fields[0]?.value || "Frosted trays"} aria-label="Component family" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                State treatment
                <Select defaultValue="mint-focus">
                  <SelectTrigger className={artFieldClass} aria-label="State treatment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mint-focus">Mint focus ring</SelectItem>
                    <SelectItem value="validation">Validation copy</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Guidance copy
              <Textarea
                className={cn(artFieldClass, "min-h-24")}
                defaultValue={surfaceNote(tokens)}
                aria-label="Guidance copy"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
              <div className="dew-subpanel space-y-3 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked aria-label="Require keyboard state" />
                  Keyboard state required
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  Soft validation
                  <Switch defaultChecked aria-label="Soft validation" />
                </label>
              </div>
              <div className="dew-subpanel space-y-3 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Density</span>
                  <Badge variant="secondary" className="shadsync-status">62</Badge>
                </div>
                <Slider defaultValue={[62]} max={100} aria-label="Density" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {["Focus", "Valid", "Saved"].map((status) => <SceneBadge key={status} status={status} />)}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className={artButtonClass("outline")}>
                {scene.secondaryAction || "Preview"}
              </Button>
              <Button size="sm" className={artButtonClass("primary")}>
                {scene.primaryAction || "Save"}
              </Button>
            </div>
          </CardFooter>
        </Card>

        <aside className="dew-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Detail sheet</div>
              <div className="text-xs text-muted-foreground">Language cues</div>
            </div>
            <Badge variant="outline" className="shadsync-chip">sheet</Badge>
          </div>
          <Separator className="my-3" />
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={sceneItemKey("dew-field", field, index)} className="dew-field-note">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {field.label}
                </div>
                <div className="mt-1 text-sm font-medium">{field.value}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DewCandyOperationsScene({ shot }: { shot: Shot }) {
  const scene = shot.scene ?? {};
  const rows = normalizeSceneItems(scene.rows, [
    { label: "Button hierarchy", value: "approved", status: "Done" },
    { label: "Table rhythm", value: "needs polish", status: "Watch" },
    { label: "Empty state", value: "quiet draft", status: "Queued" },
  ]);
  const headline =
    scene.headline === "Compact review queue"
      ? "Surface review queue"
      : scene.headline || "Surface review queue";
  const description =
    typeof scene.description === "string" && scene.description.includes("narrow viewport")
      ? "A compact workbench for checking component polish, state rhythm, and blocked fixes."
      : scene.description || "A compact workbench for checking component polish, state rhythm, and blocked fixes.";

  return (
    <div className="dew-scene space-y-4">
      <div className="dew-scene-kicker">
        <SceneBadge status={scene.eyebrow || "operations"} />
        <Badge variant="outline" className="shadsync-chip h-5">data view</Badge>
      </div>
      <Card className={cn(artCardClass, "dew-panel dew-ops-card")}>
        <CardHeader className="gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{headline}</CardTitle>
              <CardDescription>
                {description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" className={artButtonClass("icon")} aria-label="Filter queue">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filter queue</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="outline" className={artButtonClass("icon")} aria-label="Queue actions">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Assign reviewer</DropdownMenuItem>
                  <DropdownMenuItem>Copy artifact link</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Mark blocked</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="dew-ops-toolbar">
            <Tabs defaultValue="queued" className="w-full sm:w-auto">
              <TabsList className="shadsync-tabs dew-ops-tabs grid w-full grid-cols-3 sm:w-72">
                <TabsTrigger value="queued">Queued</TabsTrigger>
                <TabsTrigger value="blocked">Blocked</TabsTrigger>
                <TabsTrigger value="done">Done</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="dew-ops-search relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className={cn(artFieldClass, "h-8 pl-8 sm:w-52")} defaultValue="surface state" aria-label="Search queue" />
            </div>
          </div>
          <Table className="shadsync-table dew-ops-table">
            <TableHeader>
              <TableRow>
                <TableHead>Check</TableHead>
                <TableHead>Finding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 4).map((row, index) => {
                const lower = `${row.label} ${row.value} ${row.status ?? ""}`.toLowerCase();
                const tone = lower.includes("block") || lower.includes("needs") || lower.includes("watch")
                  ? "watch"
                  : lower.includes("done") || lower.includes("approved") || lower.includes("ok")
                    ? "ok"
                    : "neutral";
                return (
                  <TableRow key={sceneItemKey("dew-operation", row, index)} data-dew-row-tone={tone}>
                    <TableCell className="font-medium">
                      <span className="dew-ops-check">
                        <span className="dew-ops-dot" aria-hidden="true" />
                        {row.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.value}</TableCell>
                    <TableCell><SceneBadge status={row.status || "Queued"} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <span className="text-xs text-muted-foreground">One watch item needs a designer pass.</span>
          <Button size="sm" variant="destructive" className={cn(artButtonClass("outline"), "dew-destructive-button")}>
            {scene.primaryAction || "Resolve"} watch
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function SceneHeader({
  shot,
  fallbackHeadline,
}: {
  shot: Shot;
  fallbackHeadline: string;
}) {
  const scene = shot.scene ?? {};
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="shadsync-status h-5 rounded-md">{scene.eyebrow || shot.viewport}</Badge>
          <Badge variant="outline" className="shadsync-chip h-5 rounded-md">
            {shot.id}
          </Badge>
        </div>
        <h4
          className="text-balance text-xl font-semibold leading-tight sm:text-2xl"
          style={{ fontFamily: "var(--sample-display-font)" }}
        >
          {scene.headline || fallbackHeadline}
        </h4>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {scene.description || shot.composition}
        </p>
      </div>
      <PrimitiveRail shot={shot} />
    </div>
  );
}

function ApplicationShellScene({
  shot,
  tokens,
  displayName,
}: {
  shot: Shot;
  tokens: TokenRecord;
  displayName: string;
}) {
  const scene = shot.scene ?? {};
  const rows = normalizeSceneItems(scene.rows, [
    { label: "Primary flow", value: "mapped", status: "active" },
    { label: "Token coverage", value: "semantic", status: "synced" },
    { label: "Responsive proof", value: "queued", status: "review" },
  ]);
  const stats = normalizeSceneItems(scene.stats, [
    { label: "components", value: "16", tone: "accent" },
    { label: "states", value: "ready" },
    { label: "density", value: "balanced", tone: "warning" },
  ]);

  return (
    <div className="space-y-3">
      <SceneHeader shot={shot} fallbackHeadline={`${displayName} workspace`} />
      <div className="grid items-start gap-3 sm:grid-cols-[154px_minmax(0,1fr)]">
        <ArtPanel tone="surface">
          <div className="shadsync-card p-3">
          <div className="mb-4 flex items-center gap-2">
            <div className="shadsync-icon-chip flex h-7 w-7 items-center justify-center">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{displayName}</div>
              <div className="text-[11px] text-muted-foreground">shadcn layer</div>
            </div>
          </div>
          <div className="space-y-1.5 text-sm">
            {["Overview", "Components", "Reviews", "Exports"].map((item, index) => (
              <div
                key={item}
                className={cn(
                  "shadsync-nav-item px-2 py-1.5",
                  index === 1 ? "is-active" : "text-muted-foreground",
                )}
              >
                {item}
              </div>
            ))}
          </div>
          </div>
        </ArtPanel>

        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SwatchRail tokens={tokens} />
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className={artButtonClass("secondary")}>
                {scene.secondaryAction || "Review"}
              </Button>
              <Button size="sm" className={artButtonClass("primary")}>{scene.primaryAction || "Apply theme"}</Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {stats.slice(0, 3).map((stat, index) => (
              <MetricCard
                key={sceneItemKey("stat", stat, index)}
                label={stat.label}
                value={stat.value}
                tone={stat.tone}
              />
            ))}
          </div>
          <ArtPanel tone="surface">
          <Card className={cn(artCardClass, "shadsync-data-card")}>
            <CardHeader className="gap-3">
              <CardTitle>Component coverage</CardTitle>
              <CardDescription>
                Filters, state, and row density rendered with the generated theme.
              </CardDescription>
              <CardAction>
                <div className="flex gap-2">
                  <Input className={cn(artFieldClass, "h-8 w-36")} defaultValue="state badges" aria-label="Search coverage" />
                  <Select defaultValue="ready">
                    <SelectTrigger className={cn(artFieldClass, "h-8 w-28")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Table className="shadsync-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Surface</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={sceneItemKey("row", row, index)}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-muted-foreground">{row.value}</TableCell>
                      <TableCell>
                        <SceneBadge status={row.status || "ready"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          </ArtPanel>
        </div>
      </div>
      <ShotNotes shot={shot} />
    </div>
  );
}

function DetailEditorScene({
  shot,
  tokens,
  displayName,
}: {
  shot: Shot;
  tokens: TokenRecord;
  displayName: string;
}) {
  const scene = shot.scene ?? {};
  const fields = normalizeSceneItems(scene.fields, [
    { label: "Component family", value: "Narrative cards" },
    { label: "State treatment", value: "Visible focus" },
    { label: "Motion", value: "Small lift" },
  ]);
  const statuses = normalizeStatuses(scene.statuses, ["Focus", "Invalid", "Confirmed"], fields);
  const note = surfaceNote(tokens);

  return (
    <div className="space-y-3">
      <SceneHeader shot={shot} fallbackHeadline={`${displayName} editor`} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_238px]">
        <ArtPanel tone="surface">
        <Card className={cn(artCardClass, "shadsync-editor-card")}>
          <CardHeader>
            <CardTitle>Recipe details</CardTitle>
            <CardDescription>Labels, validation, written guidance, and controls stay visible.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Component family
                <Input className={artFieldClass} defaultValue={fields[0]?.value || "Narrative cards"} aria-label="Component family" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                State treatment
                <Select defaultValue="visible-focus">
                  <SelectTrigger className={artFieldClass} aria-label="State treatment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visible-focus">Visible focus</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Guidance copy
              <Textarea className={cn(artFieldClass, "min-h-24")} defaultValue={note} aria-label="Guidance copy" />
            </label>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="shadsync-mini-panel space-y-3 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked aria-label="Require keyboard state" />
                  Require keyboard state
                </label>
                <label className="flex items-center justify-between gap-3 text-sm">
                  Agent-authored shot
                  <Switch defaultChecked aria-label="Agent-authored shot" />
                </label>
              </div>
              <div className="shadsync-mini-panel space-y-3 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Density</span>
                  <Badge variant="secondary" className="shadsync-status">68</Badge>
                </div>
                <Slider defaultValue={[68]} max={100} aria-label="Density" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((status, index) => (
                <SceneBadge key={`detail-status-${index}-${status}`} status={status} />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className={artButtonClass("outline")}>
                {scene.secondaryAction || "Open sheet"}
              </Button>
              <Button size="sm" className={artButtonClass("primary")}>{scene.primaryAction || "Save recipe"}</Button>
            </div>
          </CardFooter>
        </Card>
        </ArtPanel>

        <ArtPanel tone="secondary">
        <div className="shadsync-card p-3 text-popover-foreground">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">Context sheet</div>
              <div className="text-xs text-muted-foreground">Generated with the language job</div>
            </div>
            <Badge variant="outline" className="shadsync-chip">sheet</Badge>
          </div>
          <Separator className="my-3" />
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={sceneItemKey("field", field, index)} className="shadsync-field-card p-2">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {field.label}
                </div>
                <div className="text-sm font-medium">{field.value}</div>
              </div>
            ))}
          </div>
        </div>
        </ArtPanel>
      </div>
      <ShotNotes shot={shot} />
    </div>
  );
}

function DataOperationsScene({
  shot,
}: {
  shot: Shot;
}) {
  const scene = shot.scene ?? {};
  const rows = normalizeSceneItems(scene.rows, [
    { label: "Button hierarchy", value: "approved", status: "ok" },
    { label: "Table rhythm", value: "needs pass", status: "watch" },
    { label: "Empty state", value: "designed", status: "done" },
  ], {
    labelKeys: ["label", "kit", "station", "check", "title", "name"],
    valueKeys: ["value", "due", "room", "next", "detail", "description"],
  });
  const statuses = normalizeStatuses(scene.statuses, ["Queued", "Blocked", "Done"], rows);

  return (
    <div className="space-y-3">
      <SceneHeader shot={shot} fallbackHeadline="Compact review queue" />
      <ArtPanel tone="surface">
      <Card className={cn(artCardClass, "shadsync-data-card")}>
        <CardHeader className="gap-3">
          <div>
            <CardTitle>{scene.headline || "Compact review queue"}</CardTitle>
            <CardDescription>{scene.description || shot.composition}</CardDescription>
          </div>
          <CardAction>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon-sm" variant="outline" className={artButtonClass("icon")} aria-label="Filter queue">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filter queue</TooltipContent>
              </Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="outline" className={artButtonClass("icon")} aria-label="Queue actions">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Assign reviewer</DropdownMenuItem>
                  <DropdownMenuItem>Copy artifact link</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Mark blocked</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs defaultValue="queued" className="w-full sm:w-auto">
              <TabsList className="shadsync-tabs grid w-full grid-cols-3 sm:w-72">
                <TabsTrigger value="queued">Queued</TabsTrigger>
                <TabsTrigger value="blocked">Blocked</TabsTrigger>
                <TabsTrigger value="done">Done</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className={cn(artFieldClass, "h-8 pl-8 sm:w-56")} defaultValue="button hierarchy" aria-label="Search queue" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statuses.map((status, index) => (
              <SceneBadge key={`data-status-${index}-${status}`} status={status} />
            ))}
          </div>
          <Table className="shadsync-table">
            <TableHeader>
              <TableRow>
                <TableHead>Check</TableHead>
                <TableHead>Finding</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={sceneItemKey("operation-row", row, index)}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-muted-foreground">{row.value}</TableCell>
                  <TableCell>
                    <SceneBadge status={row.status || "queued"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Responsive table, menu, tooltip, and badge proof.
          </span>
          <Button size="sm" variant="destructive" className={artButtonClass("outline")}>
            Resolve blocked
          </Button>
        </CardFooter>
      </Card>
      </ArtPanel>
      <ShotNotes shot={shot} />
    </div>
  );
}

function ShotScenePreview({
  shot,
  tokens,
  displayName,
}: {
  shot: Shot;
  tokens: TokenRecord;
  displayName: string;
}) {
  const dewCandy = isDewCandyLanguage(displayName);
  return (
    <section
      className={cn("shadsync-shot relative p-3 text-foreground", dewCandy && "dew-candy-shot")}
      data-testid={`shadcn-shot-${shot.id}`}
    >
      {dewCandy && shot.id === "detail-editor" ? (
        <DewCandyEditorScene shot={shot} tokens={tokens} />
      ) : dewCandy && shot.id === "data-operations" ? (
        <DewCandyOperationsScene shot={shot} />
      ) : dewCandy ? (
        <DewCandyAppScene shot={shot} tokens={tokens} displayName={displayName} />
      ) : shot.id === "detail-editor" ? (
        <DetailEditorScene shot={shot} tokens={tokens} displayName={displayName} />
      ) : shot.id === "data-operations" ? (
        <DataOperationsScene shot={shot} />
      ) : (
        <ApplicationShellScene shot={shot} tokens={tokens} displayName={displayName} />
      )}
    </section>
  );
}

function ShotPreviewDeck({
  artifact,
  tokens,
  languageName,
  status,
  componentSpec,
}: {
  artifact: ShadSyncPreviewArtifact;
  tokens: TokenRecord;
  languageName?: string;
  status: ArtifactStatus;
  componentSpec?: string;
}) {
  const displayName = artifact.language?.name || languageName || "Katagami language";
  const identityNotes = listFromUnknown(artifact.identityNotes);
  const notes = (identityNotes.length ? identityNotes : [surfaceNote(tokens)]).slice(0, 3);
  const visualProfile = visualProfileFromArtifact(artifact, tokens, componentSpec);
  const curatedMode = isDewCandyLanguage(displayName) ? "dew-candy" : undefined;

  return (
    <TooltipProvider>
      <div
        className="shadsync-preview relative overflow-hidden p-3 text-foreground"
        data-shadcn-preview-source={status}
        data-shadcn-preview-shot-count={artifact.shots.length}
        data-shadsync-family={visualProfile.family}
        data-shadsync-border={visualProfile.border}
        data-shadsync-underlay={visualProfile.underlay ? "true" : "false"}
        data-shadsync-grain={visualProfile.grain ? "true" : "false"}
        data-shadsync-contour={visualProfile.contour}
        data-shadsync-motion={visualProfile.motion}
        data-shadsync-curated={curatedMode}
        data-testid="shadcn-preview-deck"
        style={{
          ...shadSyncVars(visualProfile, tokens),
        }}
      >
        <div className="shadsync-grain" aria-hidden="true" />
        <div className="shadsync-tape shadsync-tape-a" aria-hidden="true" />
        <div className="shadsync-tape shadsync-tape-b" aria-hidden="true" />
        <div className="shadsync-preview-header mb-3 flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="shadsync-status">shadsync shots</Badge>
              <ArtifactStatusBadge status={status} />
              <Badge variant="outline" className="shadsync-chip">
                {visualProfile.family}
              </Badge>
            </div>
            <h3
              className="text-balance text-2xl font-semibold leading-none sm:text-3xl"
              style={{ fontFamily: "var(--sample-display-font)" }}
            >
              {displayName}
            </h3>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Agent-authored scenes, component recipes, and visual profile rendered on local shadcn-style primitives.
            </p>
          </div>
          <div className="grid gap-1.5 sm:max-w-md sm:justify-end">
            {notes.map((note) => (
              <span key={note} className="shadsync-note">
                {note}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {artifact.shots.slice(0, 3).map((shot) => (
            <ShotScenePreview
              key={shot.id}
              shot={shot}
              tokens={tokens}
              displayName={displayName}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
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
  storedThemeJson,
  storedComponentSpec,
  storedPreviewShots,
  shadcnDesignMd,
  themeStatus = "generated-preview",
  componentSpecStatus = "generated-preview",
  previewShotsStatus = "generated-preview",
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
  const generatedJson = useMemo(() => shadcnThemeToJson(theme), [theme]);
  const json = storedThemeJson?.trim() ? storedThemeJson : generatedJson;
  const css = useMemo(() => shadcnCssBlock(theme), [theme]);
  const generatedComponentSpec = useMemo(
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
  const hasAgentAuthoredComponentSpec = isAgentAuthoredShadcnComponentSpec(storedComponentSpec);
  const componentSpec = hasAgentAuthoredComponentSpec
    ? storedComponentSpec ?? generatedComponentSpec
    : generatedComponentSpec;
  const tsxExample = useMemo(
    () =>
      shadcnExampleTsx({
        languageId,
        name: languageName,
        slug,
        tokens: tokensRaw,
        philosophy: philosophyRaw,
        rules: rulesRaw,
        layout: layoutRaw,
        guidance: guidanceRaw,
      }),
    [
      languageId,
      languageName,
      slug,
      tokensRaw,
      philosophyRaw,
      rulesRaw,
      layoutRaw,
      guidanceRaw,
    ],
  );
  const tokens = useMemo(() => parseTokens(tokensRaw), [tokensRaw]);
  const generatedPreviewShots = useMemo(
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
  const storedShotsArtifact = useMemo(
    () => (storedPreviewShots?.trim() ? parsePreviewShots(storedPreviewShots) : null),
    [storedPreviewShots],
  );
  const generatedShotsArtifact = useMemo(
    () => parsePreviewShots(generatedPreviewShots),
    [generatedPreviewShots],
  );
  const hasAgentAuthoredShots = isAgentAuthoredArtifact(storedShotsArtifact);
  const previewShots = hasAgentAuthoredShots && storedPreviewShots
    ? storedPreviewShots
    : generatedPreviewShots;
  const shotsArtifact = hasAgentAuthoredShots ? storedShotsArtifact : generatedShotsArtifact;
  const hasStoredComponentSpec = hasAgentAuthoredComponentSpec;
  const hasAgentKit =
    hasAgentAuthoredShots &&
    hasStoredComponentSpec &&
    componentSpecStatus === "validated";
  const effectivePreviewShotsStatus = hasAgentAuthoredShots
    ? previewShotsStatus
    : "generated-preview";
  const previewShotsForCopy = useMemo(() => {
    if (!shotsArtifact) return previewShots;
    if (shotsArtifact.visualProfile) return previewShots;
    return `${JSON.stringify(
      {
        ...shotsArtifact,
        visualProfile: visualProfileFromArtifact(shotsArtifact, tokens, componentSpec),
      },
      null,
      2,
    )}\n`;
  }, [componentSpec, previewShots, shotsArtifact, tokens]);
  const lightStyle = useMemo(
    () => ({ ...shadcnVarsToStyle(theme.cssVars.light), ...sampleVars(tokens) }),
    [theme, tokens],
  );
  const darkStyle = useMemo(
    () => ({ ...shadcnVarsToStyle(theme.cssVars.dark), ...sampleVars(tokens) }),
    [theme, tokens],
  );
  const shadcnDesignMdForCopy = shadcnDesignMd?.trim()
    ? shadcnDesignMd
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <ImplementationKitNotice
        hasAgentKit={hasAgentKit}
        componentSpecStatus={
          hasStoredComponentSpec ? componentSpecStatus : "generated-preview"
        }
        previewShotsStatus={effectivePreviewShotsStatus}
      />

      <div className="grid gap-4">
        <div className="text-foreground" style={lightStyle}>
          {hasAgentKit && shotsArtifact ? (
            <ShotPreviewDeck
              artifact={shotsArtifact}
              tokens={tokens}
              languageName={languageName}
              status={effectivePreviewShotsStatus}
              componentSpec={componentSpec}
            />
          ) : (
            <CompatibilityCheckPanel tokens={tokens} />
          )}
        </div>
        {!compact && hasAgentKit && shotsArtifact ? (
          <div
            className="dark text-foreground"
            style={darkStyle}
          >
            <ShotPreviewDeck
              artifact={shotsArtifact}
              tokens={tokens}
              languageName={languageName}
              status={effectivePreviewShotsStatus}
              componentSpec={componentSpec}
            />
          </div>
        ) : null}
      </div>

      {shadcnDesignMdForCopy ? (
        <ShadcnKitCopyPanel
          value={shadcnDesignMdForCopy}
          hasAgentKit={hasAgentKit}
          themeStatus={storedThemeJson?.trim() ? themeStatus : "generated-preview"}
          componentSpecStatus={hasAgentAuthoredComponentSpec ? componentSpecStatus : "generated-preview"}
          previewShotsStatus={effectivePreviewShotsStatus}
        />
      ) : null}

      <details className="group bg-card/70 shadow-[var(--shadow-card)]">
        <summary className="flex cursor-pointer list-none flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            advanced implementation files
          </span>
          <span className="text-xs text-muted-foreground">
            optional machine-readable theme, CSS, TSX starter, recipes, and preview contract
          </span>
        </summary>
        <div className="grid gap-3 p-3 pt-0 lg:grid-cols-3">
        <ArtifactBlock label="shadcn add" value={shadcnInstallCommand()} />
        <ArtifactBlock label="theme css" value={css} />
        <ArtifactBlock label="tsx starter" value={tsxExample} />
        <ArtifactBlock
          label="theme JSON"
          value={json}
          status={storedThemeJson?.trim() ? themeStatus : "generated-preview"}
        />
        <ArtifactBlock
          label="component recipes"
          value={componentSpec}
          status={hasAgentAuthoredComponentSpec ? componentSpecStatus : "generated-preview"}
        />
        <ArtifactBlock
          label="preview shots"
          value={previewShotsForCopy}
          status={effectivePreviewShotsStatus}
        />
        </div>
      </details>
    </div>
  );
}
