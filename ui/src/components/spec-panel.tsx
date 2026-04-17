import {
  ChevronRight,
  FileText,
  Download,
  Copy,
  Sparkles,
} from "lucide-react";
import { parseJson } from "@/lib/odata";

interface SpecPanelProps {
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
        background: `color-mix(in oklch, var(--${color}) 32%, white)`,
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
          <blockquote className="border-l-2 border-[var(--ramune)] bg-white/40 py-2 pl-4 pr-3 text-[13px] italic leading-relaxed text-foreground/80">
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
            className="flex items-center gap-2.5 border border-border bg-white/55 p-2"
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
                  className="bg-white/40 py-2 pl-4 pr-3 text-[14px] italic leading-relaxed text-foreground/85"
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

function MarkdownPlaceholder() {
  return (
    <div className="relative border border-dashed border-border bg-white/50 p-6 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 -top-2 h-[14px] w-14 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.05)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--yuzu) 75%, white) 0 6px, color-mix(in oklch, var(--yuzu) 35%, white) 6px 12px)",
          transform: "rotate(-6deg)",
        }}
      />
      <FileText
        className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60"
        strokeWidth={1.5}
      />
      <div className="mb-1 font-display text-base font-bold tracking-[-0.02em]">
        spec.md
      </div>
      <p className="mx-auto max-w-xs text-[12px] leading-relaxed text-muted-foreground">
        A human-readable markdown export will live here.
      </p>
      <span className="stamp mt-3 inline-flex text-[var(--sumire)]">
        coming soon
      </span>
    </div>
  );
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

// ── Cute sticker-button placeholders ───────────────────────────────

function SpecActionButton({
  color,
  icon,
  label,
  tilt = 0,
}: {
  color: AccentColor;
  icon: React.ReactNode;
  label: string;
  tilt?: number;
}) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="group relative inline-flex cursor-not-allowed items-center gap-1.5 border border-border bg-white/85 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          background: `color-mix(in oklch, var(--${color}) 55%, white)`,
        }}
      />
      <span className="relative flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span
        aria-hidden
        className="absolute -right-2 -top-2 border border-foreground/40 bg-white px-1 py-[1px] font-mono text-[7px] font-bold uppercase tracking-[0.15em] text-foreground/70 shadow-[0_1px_0_rgba(30,35,45,0.05)]"
        style={{ transform: "rotate(6deg)" }}
      >
        soon
      </span>
    </button>
  );
}

// ── Panel ──────────────────────────────────────────────────────────

export function SpecPanel({
  philosophy,
  tokens,
  rules,
  layout,
  guidance,
  imageryDirection,
  generativeCanvas,
}: SpecPanelProps) {
  return (
    <div className="relative">
      {/* Floating copy + download chips in top-right */}
      <div className="absolute -top-1 right-0 z-10 flex items-center gap-1.5">
        <SpecActionButton
          color="yuzu"
          tilt={-1}
          icon={<Copy className="h-3 w-3" />}
          label="copy"
        />
        <SpecActionButton
          color="teal"
          tilt={1}
          icon={<Download className="h-3 w-3" />}
          label="download"
        />
        <span
          aria-hidden
          className="hidden items-center pl-1 text-muted-foreground/50 sm:inline-flex"
        >
          <Sparkles className="h-3 w-3" />
        </span>
      </div>

      {/* Spacer so chips don't collide with first section */}
      <div className="h-8" />

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
          <RichKeyValueView raw={guidance} />
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
        <Section label="raw .md" color="sumire">
          <MarkdownPlaceholder />
        </Section>
      </div>
    </div>
  );
}
