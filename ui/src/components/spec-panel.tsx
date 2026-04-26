import { ChevronRight } from "lucide-react";
import { parseJson } from "@/lib/odata";
import { SpecActions } from "./spec-actions";

export interface SpecPanelProps {
  languageId?: string;
  name?: string;
  slug?: string;
  philosophy?: string;
  tokens?: string;
  rules?: string;
  layout?: string;
  guidance?: string;
  imageryDirection?: string;
  generativeCanvas?: string;
  designMdFileId?: string;
  designMdLintResult?: string;
  hasDesignMd?: boolean;
  hasValidDesignMd?: boolean;
}

type AccentColor =
  | "sakura"
  | "yuzu"
  | "salad"
  | "matcha"
  | "teal"
  | "ramune"
  | "sumire";

const accentCycle: AccentColor[] = [
  "sakura",
  "yuzu",
  "salad",
  "teal",
  "ramune",
  "sumire",
];
const cycleColor = (i: number): AccentColor =>
  accentCycle[i % accentCycle.length];

// ── Section chrome ─────────────────────────────────────────────────

function SectionRule({
  label,
  color = "sumire",
}: {
  label: string;
  color?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className="inline-block h-[2px] w-6 rounded-[1px]"
        style={{ background: `var(--${color})` }}
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function PeeledLabel({
  children,
  index,
  color,
}: {
  children: React.ReactNode;
  index: number;
  color: string;
}) {
  const rot = (((index * 13) % 7) - 3) * 0.4;
  return (
    <span
      className="inline-flex rounded-[3px] px-2 py-0.5 text-[11px] font-medium text-foreground/85 shadow-[0_1px_0_rgba(30,35,45,0.04)]"
      style={{
        transform: `rotate(${rot}deg)`,
        background: `color-mix(in oklch, var(--${color}) 32%, var(--paper-tape-mix))`,
      }}
    >
      {children}
    </span>
  );
}

function Empty({ label = "not set" }: { label?: string }) {
  return (
    <div className="py-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
      {label}
    </div>
  );
}

// ── Views ──────────────────────────────────────────────────────────

function PhilosophyView({ raw }: { raw?: string }) {
  const data = parseJson<Record<string, unknown>>(raw);
  if (!data) return <Empty />;

  const values = (data.values as string[]) ?? [];
  const antiValues = (data.anti_values as string[]) ?? [];
  const lineage = (data.lineage as string) ?? "";
  const summary = (data.summary as string) ?? "";

  return (
    <div className="space-y-5">
      {summary && (
        <section>
          <SectionRule label="summary" color="teal" />
          <p className="text-[14px] leading-relaxed text-foreground/90">
            {summary}
          </p>
        </section>
      )}
      {values.length > 0 && (
        <section>
          <SectionRule label="values" color="salad" />
          <div className="flex flex-wrap gap-1.5">
            {values.map((v, i) => (
              <PeeledLabel key={v} index={i} color="salad">
                {v}
              </PeeledLabel>
            ))}
          </div>
        </section>
      )}
      {antiValues.length > 0 && (
        <section>
          <SectionRule label="anti-values" color="sakura" />
          <div className="flex flex-wrap gap-1.5">
            {antiValues.map((v, i) => (
              <PeeledLabel key={v} index={i} color="sakura">
                <span className="mr-1 font-bold text-[var(--beni)]">×</span>
                {v}
              </PeeledLabel>
            ))}
          </div>
        </section>
      )}
      {lineage && (
        <section>
          <SectionRule label="lineage" color="ramune" />
          <blockquote className="border-l-2 border-[var(--ramune)] bg-card/40 py-2 pl-4 pr-3 text-[13px] italic leading-relaxed text-foreground/80">
            {lineage}
          </blockquote>
        </section>
      )}
    </div>
  );
}

function TokensView({ raw }: { raw?: string }) {
  const data = parseJson<Record<string, unknown>>(raw);
  if (!data) return <Empty />;

  const groupColor: Record<string, AccentColor> = {
    colors: "sakura",
    typography: "sumire",
    spacing: "teal",
    radii: "salad",
    borders: "matcha",
    shadows: "yuzu",
    elevation: "ramune",
    motion: "teal",
    opacity: "sumire",
  };

  const entries = Object.entries(data);

  return (
    <div className="-my-1 divide-y divide-dotted divide-border/80 border-y border-dotted border-border/80">
      {entries.map(([group, values], i) => {
        const color: AccentColor = groupColor[group] ?? cycleColor(i);
        return (
          <details
            key={group}
            open={i === 0}
            className="group/sub"
          >
            <summary className="flex cursor-pointer list-none items-center gap-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span
                className="inline-block h-[2px] w-4 rounded-[1px]"
                style={{ background: `var(--${color})` }}
              />
              <span className="flex-1">{group}</span>
              <span className="font-mono text-[9px] normal-case tracking-normal text-muted-foreground/60">
                {typeof values === "object" && values
                  ? `${Object.keys(values as object).length} items`
                  : "1"}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground/70 transition-transform duration-200 group-open/sub:rotate-90" />
            </summary>
            <div className="pb-3 pt-0.5">
              {group === "colors" && typeof values === "object" && values ? (
                <ColorsGrid values={values as Record<string, unknown>} />
              ) : typeof values === "object" && values ? (
                <KVList values={values as Record<string, unknown>} />
              ) : (
                <span className="font-mono text-xs text-foreground/90">
                  {JSON.stringify(values)}
                </span>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function ColorsGrid({ values }: { values: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {Object.entries(values).map(([k, v]) => {
        const color = typeof v === "string" ? v : undefined;
        return (
          <div
            key={k}
            className="flex items-center gap-2.5 border border-border bg-card/55 p-2"
          >
            <span
              className="h-8 w-8 shrink-0 rounded-[2px] border border-border shadow-[0_1px_0_rgba(30,35,45,0.06)]"
              style={{ background: color ?? "#eee" }}
            />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                {k}
              </div>
              <div className="truncate font-mono text-[11px] text-foreground/90">
                {color ?? JSON.stringify(v)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KVList({ values }: { values: Record<string, unknown> }) {
  return (
    <dl className="grid gap-1">
      {Object.entries(values).map(([k, v]) => (
        <div
          key={k}
          className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-dashed border-border py-1.5 last:border-b-0"
        >
          <dt className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            {k.replace(/_/g, " ")}
          </dt>
          <dd className="flex-1 min-w-0 font-mono text-[11px] text-foreground/90">
            <KVValue value={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function KVValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/60">—</span>;
  }

  // Array of primitives → inline comma-separated
  if (Array.isArray(value)) {
    return (
      <span className="break-all">
        {value
          .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
          .join(", ")}
      </span>
    );
  }

  // Object → compact inline "key: value · key: value"
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {entries.map(([ik, iv], i) => (
          <span key={ik} className="whitespace-nowrap">
            <span className="text-muted-foreground/70">
              {ik.replace(/_/g, " ")}
            </span>{" "}
            <span className="text-foreground/90">
              {typeof iv === "object" ? JSON.stringify(iv) : String(iv)}
            </span>
            {i < entries.length - 1 && (
              <span className="mx-1 text-foreground/20">·</span>
            )}
          </span>
        ))}
      </span>
    );
  }

  return <span className="break-all">{String(value)}</span>;
}

function RulesView({ raw }: { raw?: string }) {
  const data = parseJson<Record<string, unknown>>(raw);
  if (!data) return <Empty />;

  if ("do" in data || "dont" in data) {
    const dos = (data.do as string[]) ?? [];
    const donts = (data.dont as string[]) ?? [];
    return (
      <div className="grid gap-5 md:grid-cols-2">
        {dos.length > 0 && (
          <section>
            <span className="stamp mb-2 inline-flex text-[var(--salad)]">
              do
            </span>
            <ul className="space-y-1.5">
              {dos.map((d) => (
                <li
                  key={d}
                  className="flex gap-2 text-[13px] leading-relaxed text-foreground/90"
                >
                  <span className="mt-0.5 font-bold text-[var(--salad)]">
                    ✓
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {donts.length > 0 && (
          <section>
            <span className="stamp mb-2 inline-flex text-[var(--beni)]">
              don&rsquo;t
            </span>
            <ul className="space-y-1.5">
              {donts.map((d) => (
                <li
                  key={d}
                  className="flex gap-2 text-[13px] leading-relaxed text-foreground/90"
                >
                  <span className="mt-0.5 font-bold text-[var(--beni)]">✗</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return <RichKeyValueView raw={raw} />;
}

function RichKeyValueView({ raw }: { raw?: string }) {
  const data = parseJson<Record<string, unknown>>(raw);
  if (!data) return <Empty />;

  return (
    <div className="space-y-5">
      {Object.entries(data).map(([key, val], i) => {
        const label = key.replace(/_/g, " ");
        const color = cycleColor(i);

        if (
          Array.isArray(val) &&
          val.every((v) => typeof v === "string")
        ) {
          return (
            <section key={key}>
              <SectionRule label={label} color={color} />
              <div className="flex flex-wrap gap-1.5">
                {(val as string[]).map((v, j) => (
                  <PeeledLabel key={`${v}-${j}`} index={j} color={color}>
                    {v}
                  </PeeledLabel>
                ))}
              </div>
            </section>
          );
        }

        if (typeof val === "string") {
          if (val.length > 160) {
            return (
              <section key={key}>
                <SectionRule label={label} color={color} />
                <blockquote
                  className="bg-card/40 py-2 pl-4 pr-3 text-[14px] italic leading-relaxed text-foreground/85"
                  style={{ borderLeft: `2px solid var(--${color})` }}
                >
                  {val}
                </blockquote>
              </section>
            );
          }
          return (
            <section key={key}>
              <SectionRule label={label} color={color} />
              <p className="text-[14px] leading-relaxed text-foreground/90">
                {val}
              </p>
            </section>
          );
        }

        if (typeof val === "object" && val !== null) {
          return (
            <section key={key}>
              <SectionRule label={label} color={color} />
              <KVList values={val as Record<string, unknown>} />
            </section>
          );
        }

        return (
          <section key={key}>
            <SectionRule label={label} color={color} />
            <span className="font-mono text-xs text-foreground/90">
              {String(val)}
            </span>
          </section>
        );
      })}
    </div>
  );
}

function SpecMarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="relative">
      <pre className="max-h-[480px] overflow-auto rounded-[2px] border border-border bg-[#faf9f6] p-4 font-mono text-[11px] leading-[1.65] text-foreground/85 selection:bg-[var(--teal)]/20">
        {markdown}
      </pre>
    </div>
  );
}

// ── Markdown generation ───────────────────────────────────────────

type JsonRecord = Record<string, unknown>;

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "object" && item !== null
        ? JSON.stringify(item)
        : String(item),
    )
    .filter((item) => item.trim().length > 0);
}

function isHexColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value)
  );
}

function toDimension(value: unknown, fallback = "16px"): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }

  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed === "0") return "0px";
  if (/^-?\d*\.?\d+(px|em|rem)$/.test(trimmed)) return trimmed;
  if (/^-?\d*\.?\d+$/.test(trimmed)) return `${trimmed}px`;
  return fallback;
}

function scaledRem(base: unknown, ratio: unknown, power: number): string {
  const baseValue = typeof base === "string" ? base.trim() : "16px";
  const match = baseValue.match(/^(\d*\.?\d+)(px|rem)$/);
  const scale = typeof ratio === "number" && ratio > 0 ? ratio : 1.25;
  if (!match) return power >= 3 ? "2.5rem" : "1.75rem";

  const amount = Number(match[1]);
  const remBase = match[2] === "px" ? amount / 16 : amount;
  return `${Number((remBase * scale ** power).toFixed(3))}rem`;
}

function yamlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

function yamlScalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return JSON.stringify(text);
}

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return String(value).trim().length > 0;
}

function appendYamlObject(lines: string[], data: JsonRecord, indent = 0) {
  const pad = " ".repeat(indent);

  for (const [key, value] of Object.entries(data)) {
    if (!hasContent(value)) continue;

    if (Array.isArray(value)) {
      lines.push(`${pad}${yamlKey(key)}:`);
      for (const item of value) {
        lines.push(`${pad}  - ${yamlScalar(item)}`);
      }
      continue;
    }

    const nested = asRecord(value);
    if (nested) {
      lines.push(`${pad}${yamlKey(key)}:`);
      appendYamlObject(lines, nested, indent + 2);
      continue;
    }

    lines.push(`${pad}${yamlKey(key)}: ${yamlScalar(value)}`);
  }
}

function renderKvSection(
  data: JsonRecord,
  lines: string[],
  depth: "##" | "###" = "###",
) {
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      lines.push(`${depth} ${titleCase(key)}`, "");
      for (const item of val) {
        lines.push(
          `- ${typeof item === "object" ? JSON.stringify(item) : String(item)}`,
        );
      }
      lines.push("");
    } else if (typeof val === "object" && val !== null) {
      lines.push(`${depth} ${titleCase(key)}`, "");
      for (const [k, v] of Object.entries(val as JsonRecord)) {
        const display = typeof v === "object" ? JSON.stringify(v) : String(v);
        lines.push(`- **${titleCase(k)}**: ${display}`);
      }
      lines.push("");
    } else if (typeof val === "string") {
      lines.push(`${depth} ${titleCase(key)}`, "", val, "");
    }
  }
}

function extractColors(tokens: JsonRecord | null): JsonRecord {
  const rawColors = asRecord(tokens?.colors);
  if (!rawColors) return {};

  return Object.fromEntries(
    Object.entries(rawColors).filter(([, value]) => isHexColor(value)),
  );
}

function extractSpacing(tokens: JsonRecord | null): JsonRecord {
  const spacing = asRecord(tokens?.spacing);
  if (!spacing) return {};

  const result: JsonRecord = {};
  const base = spacing.base;
  if (base !== undefined) result.base = toDimension(base);

  const scale = Array.isArray(spacing.scale) ? spacing.scale : [];
  const names = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
  scale.forEach((value, index) => {
    result[names[index] ?? `step-${index}`] = toDimension(value);
  });

  for (const [key, value] of Object.entries(spacing)) {
    if (key === "base" || key === "scale") continue;
    if (typeof value === "number") {
      result[key] = toDimension(value);
    } else if (typeof value === "string") {
      result[key] = toDimension(value, value);
    }
  }

  return result;
}

function extractRounded(tokens: JsonRecord | null): JsonRecord {
  const radii = asRecord(tokens?.radii);
  if (!radii) return {};

  return Object.fromEntries(
    Object.entries(radii).map(([key, value]) => [key, toDimension(value, "0px")]),
  );
}

function extractTypography(tokens: JsonRecord | null): JsonRecord {
  const typography = asRecord(tokens?.typography);
  if (!typography) return {};

  const structuredEntries = Object.entries(typography).filter(([, value]) => {
    const token = asRecord(value);
    return token && ("fontFamily" in token || "fontSize" in token);
  });

  if (structuredEntries.length > 0) {
    return Object.fromEntries(structuredEntries);
  }

  const headingFont = asString(typography.heading_font) ?? "Inter";
  const bodyFont = asString(typography.body_font) ?? headingFont;
  const monoFont = asString(typography.mono_font) ?? bodyFont;
  const baseSize = toDimension(typography.base_size);
  const lineHeight =
    typeof typography.line_height === "number" ? typography.line_height : 1.5;
  const rawLetterSpacing = asString(typography.letter_spacing);
  const letterSpacing =
    rawLetterSpacing && rawLetterSpacing !== "normal"
      ? toDimension(rawLetterSpacing, "-0.02em")
      : "-0.02em";

  return {
    "headline-lg": {
      fontFamily: headingFont,
      fontSize: scaledRem(typography.base_size, typography.scale_ratio, 3),
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing,
    },
    "headline-md": {
      fontFamily: headingFont,
      fontSize: scaledRem(typography.base_size, typography.scale_ratio, 2),
      fontWeight: 600,
      lineHeight: 1.15,
      letterSpacing,
    },
    "body-md": {
      fontFamily: bodyFont,
      fontSize: baseSize,
      fontWeight: 400,
      lineHeight,
      letterSpacing,
    },
    "label-md": {
      fontFamily: monoFont,
      fontSize: "0.75rem",
      fontWeight: 600,
      lineHeight: 1,
      letterSpacing: "0.08em",
    },
  };
}

function ref(group: string, key: string): string {
  return `{${group}.${key}}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  if (!isHexColor(hex)) return null;
  const normalized =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const value = Number.parseInt(normalized.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableTextColor(background: unknown): string {
  const bg = isHexColor(background) ? background : "#000000";
  return contrastRatio(bg, "#000000") >= contrastRatio(bg, "#ffffff")
    ? "#000000"
    : "#ffffff";
}

function firstExisting(record: JsonRecord, keys: string[]): string | null {
  return keys.find((key) => key in record) ?? null;
}

function componentColorRefs(colors: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.keys(colors).map((key) => [
      `color-reference-${key.replace(/[^A-Za-z0-9_-]/g, "-")}`,
      { backgroundColor: ref("colors", key) },
    ]),
  );
}

function buildComponentTokens(
  colors: JsonRecord,
  typography: JsonRecord,
  rounded: JsonRecord,
  spacing: JsonRecord,
): JsonRecord {
  if (Object.keys(colors).length === 0) return {};

  const primary = firstExisting(colors, ["primary", "accent", "tertiary"]);
  const surface = firstExisting(colors, ["surface", "background", "neutral"]);
  const text = firstExisting(colors, ["text", "on-surface", "primary"]);
  const roundedKey = firstExisting(rounded, ["md", "lg", "sm", "none"]);
  const paddingKey = firstExisting(spacing, ["md", "sm", "base"]);
  const label = firstExisting(typography, ["label-md", "body-md"]);

  const roundedValue = roundedKey ? ref("rounded", roundedKey) : "16px";
  const paddingValue = paddingKey ? ref("spacing", paddingKey) : "12px";
  const labelValue = label ? ref("typography", label) : undefined;

  return {
    ...componentColorRefs(colors),
    ...(primary && {
      "button-primary": {
        backgroundColor: ref("colors", primary),
        textColor: readableTextColor(colors[primary]),
        ...(labelValue ? { typography: labelValue } : {}),
        rounded: roundedValue,
        padding: paddingValue,
      },
    }),
    ...(surface &&
      text && {
        "card-surface": {
          backgroundColor: ref("colors", surface),
          textColor: ref("colors", text),
          rounded: roundedValue,
          padding: paddingKey ? ref("spacing", paddingKey) : "16px",
        },
        "input-default": {
          backgroundColor: ref("colors", surface),
          textColor: ref("colors", text),
          rounded: roundedValue,
          height: "44px",
        },
      }),
  };
}

function buildDesignMdFrontMatter(
  props: SpecPanelProps,
  tokens: JsonRecord | null,
): JsonRecord {
  const colors = extractColors(tokens);
  const typography = extractTypography(tokens);
  const spacing = extractSpacing(tokens);
  const rounded = extractRounded(tokens);
  const components = buildComponentTokens(colors, typography, rounded, spacing);

  return {
    version: "alpha",
    name: props.name ?? "Katagami Design Language",
    description:
      "Agent-curated design language exported from Katagami as DESIGN.md.",
    colors,
    typography,
    rounded,
    spacing,
    components,
  };
}

function appendList(
  lines: string[],
  title: string,
  items: string[],
  prefix?: string,
) {
  if (items.length === 0) return;
  lines.push(`### ${title}`, "");
  for (const item of items) lines.push(`- ${prefix ?? ""}${item}`);
  lines.push("");
}

function appendColors(lines: string[], colors: JsonRecord) {
  if (Object.keys(colors).length === 0) return;
  lines.push("## Colors", "");
  lines.push(
    "Use the YAML color tokens as the normative palette. The prose below names the roles agents should preserve when generating UI.",
    "",
    "| Token | Value |",
    "|-------|-------|",
  );
  for (const [key, value] of Object.entries(colors)) {
    lines.push(`| ${key} | \`${String(value)}\` |`);
  }
  lines.push("");
}

function appendTypography(lines: string[], typography: JsonRecord) {
  if (Object.keys(typography).length === 0) return;
  lines.push("## Typography", "");
  for (const [key, value] of Object.entries(typography)) {
    const token = asRecord(value);
    if (!token) continue;
    const family = asString(token.fontFamily) ?? "system-ui";
    const size = token.fontSize ? String(token.fontSize) : "16px";
    const weight = token.fontWeight ? String(token.fontWeight) : "400";
    const lineHeight = token.lineHeight ? String(token.lineHeight) : "1.5";
    lines.push(
      `- **${titleCase(key)}**: ${family}, ${size}, weight ${weight}, line-height ${lineHeight}.`,
    );
  }
  lines.push("");
}

export function katagamiSpecToMarkdown(props: SpecPanelProps): string {
  const lines: string[] = [];
  const phil = parseJson<JsonRecord>(props.philosophy);
  const tok = parseJson<JsonRecord>(props.tokens);
  const rul = parseJson<JsonRecord>(props.rules);
  const lay = parseJson<JsonRecord>(props.layout);
  const gui = parseJson<JsonRecord>(props.guidance);
  const img = parseJson<JsonRecord>(props.imageryDirection);
  const gen = parseJson<JsonRecord>(props.generativeCanvas);

  lines.push(`# ${props.name ?? "Katagami Design Language"}`, "");

  if (phil) {
    lines.push("## Philosophy", "");
    if (phil.summary) lines.push(String(phil.summary), "");
    appendList(lines, "Values", toStringArray(phil.values));
    appendList(lines, "Anti-Values", toStringArray(phil.anti_values));
    appendList(lines, "Visual Character", toStringArray(phil.visual_character));
    if (phil.lineage) {
      lines.push("### Lineage", "", `> ${String(phil.lineage)}`, "");
    }
  }

  if (tok) {
    lines.push("## Tokens", "");
    for (const [group, values] of Object.entries(tok)) {
      lines.push(`### ${titleCase(group)}`, "");
      if (
        group === "colors" &&
        typeof values === "object" &&
        values !== null
      ) {
        lines.push("| Name | Value |", "|------|-------|");
        for (const [key, value] of Object.entries(values as JsonRecord)) {
          lines.push(`| ${key} | \`${String(value)}\` |`);
        }
        lines.push("");
      } else if (typeof values === "object" && values !== null) {
        for (const [key, value] of Object.entries(values as JsonRecord)) {
          const display =
            typeof value === "object" ? JSON.stringify(value) : String(value);
          lines.push(`- **${titleCase(key)}**: ${display}`);
        }
        lines.push("");
      } else {
        lines.push(String(values), "");
      }
    }
  }

  if (rul) {
    lines.push("## Rules", "");
    renderKvSection(rul, lines);
  }

  if (lay) {
    lines.push("## Layout", "");
    renderKvSection(lay, lines);
  }

  if (gui) {
    lines.push("## Guidance", "");
    const dos = toStringArray(gui.do ?? gui.dos);
    const donts = toStringArray(gui.dont ?? gui.donts);
    appendList(lines, "Do", dos);
    appendList(lines, "Don't", donts);
    const rest = Object.fromEntries(
      Object.entries(gui).filter(
        ([key]) => !["do", "dos", "dont", "donts"].includes(key),
      ),
    );
    if (Object.keys(rest).length > 0) renderKvSection(rest, lines);
  }

  if (img) {
    lines.push("## Imagery Direction", "");
    renderKvSection(img, lines);
  }

  if (gen) {
    lines.push("## Generative Canvas", "");
    renderKvSection(gen, lines);
  }

  return lines.join("\n").trimEnd() + "\n";
}

export function designMdToMarkdown(props: SpecPanelProps): string {
  const lines: string[] = [];
  const phil = parseJson<JsonRecord>(props.philosophy);
  const tok = parseJson<JsonRecord>(props.tokens);
  const rul = parseJson<JsonRecord>(props.rules);
  const lay = parseJson<JsonRecord>(props.layout);
  const gui = parseJson<JsonRecord>(props.guidance);
  const img = parseJson<JsonRecord>(props.imageryDirection);
  const gen = parseJson<JsonRecord>(props.generativeCanvas);

  const frontMatter = buildDesignMdFrontMatter(props, tok);
  const colors = asRecord(frontMatter.colors) ?? {};
  const typography = asRecord(frontMatter.typography) ?? {};
  const spacing = asRecord(frontMatter.spacing) ?? {};
  const rounded = asRecord(frontMatter.rounded) ?? {};

  lines.push("---");
  appendYamlObject(lines, frontMatter);
  lines.push("---", "", `# ${props.name ?? "Katagami Design Language"}`, "");

  if (phil || props.name) {
    lines.push("## Overview", "");
    if (phil?.summary) {
      lines.push(String(phil.summary), "");
    } else if (props.name) {
      lines.push(
        `${props.name} is an agent-curated design language from Katagami.`,
        "",
      );
    }
    appendList(lines, "Values", toStringArray(phil?.values));
    appendList(lines, "Anti-Values", toStringArray(phil?.anti_values));
    appendList(
      lines,
      "Visual Character",
      toStringArray(phil?.visual_character),
    );
    if (phil?.lineage) {
      lines.push("### Lineage", "", `> ${String(phil.lineage)}`, "");
    }
  }

  appendColors(lines, colors);
  appendTypography(lines, typography);

  if (lay || Object.keys(spacing).length > 0) {
    lines.push("## Layout", "");
    if (Object.keys(spacing).length > 0) {
      lines.push("### Spacing Tokens", "");
      for (const [key, value] of Object.entries(spacing)) {
        lines.push(`- **${titleCase(key)}**: \`${String(value)}\``);
      }
      lines.push("");
    }
    if (lay) renderKvSection(lay, lines);
  }

  const shadows = asRecord(tok?.shadows);
  const elevation = asRecord(tok?.elevation);
  if (shadows || elevation) {
    lines.push("## Elevation & Depth", "");
    if (shadows) renderKvSection({ shadows }, lines);
    if (elevation) renderKvSection({ elevation }, lines);
  }

  const surfaces = asRecord(tok?.surfaces);
  const borders = asRecord(tok?.borders);
  if (Object.keys(rounded).length > 0 || surfaces || borders) {
    lines.push("## Shapes", "");
    if (Object.keys(rounded).length > 0) {
      lines.push("### Rounded", "");
      for (const [key, value] of Object.entries(rounded)) {
        lines.push(`- **${titleCase(key)}**: \`${String(value)}\``);
      }
      lines.push("");
    }
    if (surfaces) renderKvSection({ surfaces }, lines);
    if (borders) renderKvSection({ borders }, lines);
  }

  if (rul) {
    lines.push("## Components", "");
    renderKvSection(rul, lines);
  }

  if (gui) {
    const dos = toStringArray(gui.do ?? gui.dos);
    const donts = toStringArray(gui.dont ?? gui.donts);
    if (dos.length > 0 || donts.length > 0) {
      lines.push("## Do's and Don'ts", "");
      for (const item of dos) lines.push(`- Do ${item}`);
      for (const item of donts) lines.push(`- Don't ${item}`);
      lines.push("");
    }
    const rest = Object.fromEntries(
      Object.entries(gui).filter(
        ([key]) => !["do", "dos", "dont", "donts"].includes(key),
      ),
    );
    if (Object.keys(rest).length > 0) renderKvSection(rest, lines);
  }

  if (img) {
    lines.push("## Imagery Direction", "");
    renderKvSection(img, lines);
  }

  if (gen) {
    lines.push("## Generative Canvas", "");
    renderKvSection(gen, lines);
  }

  return lines.join("\n").trimEnd() + "\n";
}

export const specToMarkdown = katagamiSpecToMarkdown;

// ── Accordion row ──────────────────────────────────────────────────

function Section({
  label,
  color,
  defaultOpen,
  children,
}: {
  label: string;
  color: AccentColor;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-dashed border-border last:border-b-0"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span
          className="inline-block h-[3px] w-5 rounded-[1px]"
          style={{ background: `var(--${color})` }}
        />
        <span className="flex-1">{label}</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200 group-open:rotate-90" />
      </summary>
      <div className="pb-5 pt-1">{children}</div>
    </details>
  );
}


// ── Panel ──────────────────────────────────────────────────────────

export function SpecPanel(props: SpecPanelProps) {
  const {
    philosophy,
    tokens,
    rules,
    layout,
    guidance,
    imageryDirection,
    generativeCanvas,
  } = props;

  const katagamiMarkdown = katagamiSpecToMarkdown(props);
  const designMd = designMdToMarkdown(props);

  return (
    <div className="relative">
      {/* Copy + download — inline on mobile, floating on sm+ */}
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2 sm:absolute sm:-top-1 sm:right-0 sm:z-10 sm:mb-0">
        <SpecActions
          languageId={props.languageId}
          katagamiSpec={katagamiMarkdown}
          designMd={designMd}
          slug={props.slug}
        />
      </div>

      {/* Spacer on sm+ so floating chips don't collide with first section */}
      <div className="hidden h-16 sm:block" />

      <div className="divide-y divide-dashed divide-border">
        <Section label="philosophy" color="teal" defaultOpen>
          <PhilosophyView raw={philosophy} />
        </Section>
        <Section label="tokens" color="sakura">
          <TokensView raw={tokens} />
        </Section>
        <Section label="rules" color="salad">
          <RulesView raw={rules} />
        </Section>
        <Section label="layout" color="sumire">
          <RichKeyValueView raw={layout} />
        </Section>
        <Section label="guidance" color="yuzu">
          <RulesView raw={guidance} />
        </Section>
        {imageryDirection && (
          <Section label="imagery" color="ramune">
            <RichKeyValueView raw={imageryDirection} />
          </Section>
        )}
        {generativeCanvas && (
          <Section label="generative" color="matcha">
            <RichKeyValueView raw={generativeCanvas} />
          </Section>
        )}
        <Section label="katagami spec" color="teal">
          <SpecMarkdownView markdown={katagamiMarkdown} />
        </Section>
        <Section label="DESIGN.md" color="sumire">
          <SpecMarkdownView markdown={designMd} />
        </Section>
      </div>
    </div>
  );
}
