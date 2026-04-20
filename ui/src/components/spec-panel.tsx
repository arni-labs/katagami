import { ChevronRight } from "lucide-react";
import { parseJson } from "@/lib/odata";
import { SpecActions } from "./spec-actions";

interface SpecPanelProps {
  name?: string;
  slug?: string;
  philosophy?: string;
  tokens?: string;
  rules?: string;
  layout?: string;
  guidance?: string;
  imageryDirection?: string;
  generativeCanvas?: string;
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

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderKvSection(
  data: Record<string, unknown>,
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
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        const display = typeof v === "object" ? JSON.stringify(v) : String(v);
        lines.push(`- **${titleCase(k)}**: ${display}`);
      }
      lines.push("");
    } else if (typeof val === "string") {
      lines.push(`${depth} ${titleCase(key)}`, "", val, "");
    }
  }
}

function specToMarkdown(props: SpecPanelProps): string {
  const lines: string[] = [];

  if (props.name) {
    lines.push(`# ${props.name}`, "");
  }

  // Philosophy
  const phil = parseJson<Record<string, unknown>>(props.philosophy);
  if (phil) {
    lines.push("## Philosophy", "");
    if (phil.summary) lines.push(String(phil.summary), "");
    const listSections: [string, string][] = [
      ["values", "Values"],
      ["anti_values", "Anti-Values"],
      ["visual_character", "Visual Character"],
    ];
    for (const [field, label] of listSections) {
      const arr = phil[field] as string[] | undefined;
      if (Array.isArray(arr) && arr.length > 0) {
        lines.push(`### ${label}`, "");
        for (const v of arr) lines.push(`- ${v}`);
        lines.push("");
      }
    }
    if (phil.lineage) lines.push("### Lineage", "", `> ${phil.lineage}`, "");
  }

  // Tokens
  const tok = parseJson<Record<string, unknown>>(props.tokens);
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
        for (const [k, v] of Object.entries(
          values as Record<string, unknown>,
        )) {
          lines.push(`| ${k} | \`${v}\` |`);
        }
        lines.push("");
      } else if (typeof values === "object" && values !== null) {
        for (const [k, v] of Object.entries(
          values as Record<string, unknown>,
        )) {
          const display = typeof v === "object" ? JSON.stringify(v) : String(v);
          lines.push(`- **${titleCase(k)}**: ${display}`);
        }
        lines.push("");
      } else {
        lines.push(String(values), "");
      }
    }
  }

  // Rules
  const rul = parseJson<Record<string, unknown>>(props.rules);
  if (rul) {
    lines.push("## Rules", "");
    renderKvSection(rul, lines);
  }

  // Layout
  const lay = parseJson<Record<string, unknown>>(props.layout);
  if (lay) {
    lines.push("## Layout", "");
    renderKvSection(lay, lines);
  }

  // Guidance
  const gui = parseJson<Record<string, unknown>>(props.guidance);
  if (gui) {
    lines.push("## Guidance", "");
    if (Array.isArray(gui.do) && gui.do.length > 0) {
      lines.push("### Do", "");
      for (const d of gui.do as string[]) lines.push(`- ${d}`);
      lines.push("");
    }
    if (Array.isArray(gui.dont) && gui.dont.length > 0) {
      lines.push("### Don't", "");
      for (const d of gui.dont as string[]) lines.push(`- ${d}`);
      lines.push("");
    }
  }

  // Imagery Direction
  const img = parseJson<Record<string, unknown>>(props.imageryDirection);
  if (img) {
    lines.push("## Imagery Direction", "");
    renderKvSection(img, lines);
  }

  // Generative Canvas
  const gen = parseJson<Record<string, unknown>>(props.generativeCanvas);
  if (gen) {
    lines.push("## Generative Canvas", "");
    renderKvSection(gen, lines);
  }

  return lines.join("\n").trimEnd() + "\n";
}

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

  const markdown = specToMarkdown(props);

  return (
    <div className="relative">
      {/* Copy + download — inline on mobile, floating on sm+ */}
      <div className="mb-4 flex items-center justify-end sm:absolute sm:-top-1 sm:right-0 sm:z-10 sm:mb-0">
        <SpecActions markdown={markdown} slug={props.slug} />
      </div>

      {/* Spacer on sm+ so floating chips don't collide with first section */}
      <div className="hidden h-8 sm:block" />

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
        <Section label="spec.md" color="sumire">
          <SpecMarkdownView markdown={markdown} />
        </Section>
      </div>
    </div>
  );
}
