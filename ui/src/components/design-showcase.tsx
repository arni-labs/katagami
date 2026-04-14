"use client";

import { useMemo } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as Avatar from "@radix-ui/react-avatar";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Label from "@radix-ui/react-label";
import * as Popover from "@radix-ui/react-popover";
import * as Progress from "@radix-ui/react-progress";
import * as RadioGroup from "@radix-ui/react-radio-group";
import * as Select from "@radix-ui/react-select";
import * as Separator from "@radix-ui/react-separator";
import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import * as Toggle from "@radix-ui/react-toggle";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Tooltip from "@radix-ui/react-tooltip";
import { parseJson } from "@/lib/odata";
import {
  ChevronDownIcon,
  CheckIcon,
  Cross2Icon,
  HamburgerMenuIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  DotFilledIcon,
} from "@radix-ui/react-icons";

interface Tokens {
  colors?: Record<string, string>;
  typography?: Record<string, string>;
  spacing?: Record<string, string | string[]>;
  radii?: Record<string, string>;
  shadows?: Record<string, string>;
  borders?: Record<string, string>;
  [key: string]: unknown;
}

interface DesignShowcaseProps {
  tokensRaw?: string;
  languageName?: string;
}

function buildCssVars(tokens: Tokens): React.CSSProperties {
  const vars: Record<string, string> = {};

  // Colors
  const c = tokens.colors ?? {};
  vars["--ds-primary"] = c.primary ?? "#111";
  vars["--ds-secondary"] = c.secondary ?? "#666";
  vars["--ds-accent"] = c.accent ?? "#0066ff";
  vars["--ds-bg"] = c.background ?? "#ffffff";
  vars["--ds-surface"] = c.surface ?? "#f8f8f8";
  vars["--ds-surface-elevated"] = c.surface_elevated ?? c.surface ?? "#f8f8f8";
  vars["--ds-text"] = c.text ?? "#111";
  vars["--ds-text-secondary"] = c.text_secondary ?? c.muted ?? "#666";
  vars["--ds-muted"] = c.muted ?? "#888";
  vars["--ds-border"] = c.border ?? "#ddd";
  vars["--ds-border-strong"] = c.border_strong ?? c.border ?? "#ddd";
  vars["--ds-error"] = c.error ?? "#dc2626";
  vars["--ds-success"] = c.success ?? "#16a34a";
  vars["--ds-warning"] = c.warning ?? "#d97706";
  vars["--ds-info"] = c.info ?? "#2563eb";

  // Typography — full extraction
  const t = tokens.typography ?? {};
  vars["--ds-font-heading"] = t.heading_font ?? "system-ui, sans-serif";
  vars["--ds-font-body"] = t.body_font ?? "system-ui, sans-serif";
  vars["--ds-font-mono"] = t.mono_font ?? "monospace";
  vars["--ds-font-size"] = t.base_size ?? "16px";
  vars["--ds-line-height"] = t.line_height_normal ?? t.line_height ?? "1.5";
  vars["--ds-line-height-tight"] = t.line_height_tight ?? "1.1";
  vars["--ds-line-height-relaxed"] = t.line_height_relaxed ?? "1.75";
  vars["--ds-letter-spacing"] = t.letter_spacing_normal ?? t.letter_spacing ?? "0";
  vars["--ds-letter-spacing-tight"] = t.letter_spacing_tight ?? "-0.02em";
  vars["--ds-letter-spacing-wide"] = t.letter_spacing_wide ?? "0.05em";
  vars["--ds-font-weight-normal"] = t.font_weight_normal ?? "400";
  vars["--ds-font-weight-medium"] = t.font_weight_medium ?? "500";
  vars["--ds-font-weight-bold"] = t.font_weight_bold ?? "700";
  vars["--ds-heading-weight"] = t.heading_weight ?? t.font_weight_bold ?? "700";
  vars["--ds-heading-transform"] = t.heading_transform ?? "none";

  // Radii
  const r = tokens.radii ?? {};
  vars["--ds-radius-none"] = r.none ?? "0px";
  vars["--ds-radius-xs"] = r.xs ?? "2px";
  vars["--ds-radius-sm"] = r.sm ?? "4px";
  vars["--ds-radius-md"] = r.md ?? "8px";
  vars["--ds-radius-lg"] = r.lg ?? "12px";
  vars["--ds-radius-xl"] = r.xl ?? "20px";
  vars["--ds-radius-full"] = r.full ?? "9999px";

  // Shadows — must be strings
  const s = tokens.shadows ?? {};
  vars["--ds-shadow-sm"] = typeof s.sm === "string" ? s.sm : "0 1px 2px rgba(0,0,0,0.05)";
  vars["--ds-shadow-md"] = typeof s.md === "string" ? s.md : "0 4px 6px rgba(0,0,0,0.1)";
  vars["--ds-shadow-lg"] = typeof s.lg === "string" ? s.lg : "0 10px 15px rgba(0,0,0,0.1)";

  // Spacing — handle both array-based and named scales
  const sp = tokens.spacing ?? {};
  const scale = Array.isArray(sp.scale) ? sp.scale : [];
  vars["--ds-space-1"] = (scale[0] as string) ?? (sp as Record<string, string>)["1"] ?? (sp as Record<string, string>).xs ?? "4px";
  vars["--ds-space-2"] = (scale[1] as string) ?? (sp as Record<string, string>)["2"] ?? (sp as Record<string, string>).sm ?? "8px";
  vars["--ds-space-3"] = (scale[2] as string) ?? (sp as Record<string, string>)["3"] ?? (sp as Record<string, string>).md ?? "12px";
  vars["--ds-space-4"] = (scale[3] as string) ?? (sp as Record<string, string>)["4"] ?? (sp as Record<string, string>).base ?? "16px";
  vars["--ds-space-5"] = (scale[4] as string) ?? (sp as Record<string, string>)["5"] ?? (sp as Record<string, string>).lg ?? "24px";
  vars["--ds-space-6"] = (scale[5] as string) ?? (sp as Record<string, string>)["6"] ?? (sp as Record<string, string>).xl ?? "32px";
  vars["--ds-card-padding"] = (sp as Record<string, string>).card_padding ?? vars["--ds-space-5"];
  vars["--ds-input-padding"] = (sp as Record<string, string>).input_padding ?? `${vars["--ds-space-2"]} ${vars["--ds-space-3"]}`;

  // Borders
  const b = tokens.borders ?? {};
  vars["--ds-border-width"] = b.width_default ?? "1px";
  vars["--ds-border-width-strong"] = b.width_strong ?? b.width_default ?? "1px";

  return vars as React.CSSProperties;
}

/* ── Tiny inline style helpers (no Tailwind in the showcase zone) ── */

const heading = (level: 1 | 2 | 3 | 4): React.CSSProperties => {
  const scales: Record<number, string> = { 1: "2.4em", 2: "1.8em", 3: "1.3em", 4: "1.1em" };
  return {
    fontFamily: "var(--ds-font-heading)",
    fontSize: scales[level],
    fontWeight: "var(--ds-heading-weight)" as unknown as number,
    lineHeight: "var(--ds-line-height-tight)",
    letterSpacing: "var(--ds-letter-spacing-wide)",
    textTransform: "var(--ds-heading-transform)" as React.CSSProperties["textTransform"],
    color: "var(--ds-text)",
    margin: 0,
  };
};

const body: React.CSSProperties = {
  fontFamily: "var(--ds-font-body)",
  fontSize: "var(--ds-font-size)",
  fontWeight: "var(--ds-font-weight-normal)" as unknown as number,
  lineHeight: "var(--ds-line-height)",
  letterSpacing: "var(--ds-letter-spacing)",
  color: "var(--ds-text)",
};

const mono: React.CSSProperties = {
  fontFamily: "var(--ds-font-mono)",
  fontSize: "0.875em",
};

const sectionTitle: React.CSSProperties = {
  ...heading(3),
  color: "var(--ds-muted)",
  textTransform: "uppercase" as const,
  fontSize: "0.7em",
  letterSpacing: "0.12em",
  marginBottom: "var(--ds-space-4)",
};

const card: React.CSSProperties = {
  background: "var(--ds-surface)",
  border: "var(--ds-border-width) solid var(--ds-border)",
  borderRadius: "var(--ds-radius-lg)",
  padding: "var(--ds-card-padding)",
  boxShadow: "var(--ds-shadow-sm)",
};

const btn = (variant: "primary" | "secondary" | "outline" | "ghost" | "destructive"): React.CSSProperties => {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--ds-space-2)",
    padding: "var(--ds-space-2) var(--ds-space-4)",
    borderRadius: "var(--ds-radius-md)",
    fontFamily: "var(--ds-font-body)",
    fontSize: "0.875em",
    fontWeight: "var(--ds-font-weight-medium)" as unknown as number,
    cursor: "pointer",
    transition: "all 150ms ease",
    border: "var(--ds-border-width) solid transparent",
    lineHeight: 1.5,
    letterSpacing: "var(--ds-letter-spacing)",
    textTransform: "var(--ds-heading-transform)" as React.CSSProperties["textTransform"],
  };
  switch (variant) {
    case "primary":
      return { ...base, background: "var(--ds-primary)", color: "var(--ds-bg)", borderColor: "var(--ds-primary)", boxShadow: "var(--ds-shadow-sm)" };
    case "secondary":
      return { ...base, background: "var(--ds-secondary)", color: "var(--ds-bg)", borderColor: "var(--ds-secondary)" };
    case "outline":
      return { ...base, background: "transparent", color: "var(--ds-text)", borderColor: "var(--ds-border-strong)", borderWidth: "var(--ds-border-width-strong)" };
    case "ghost":
      return { ...base, background: "transparent", color: "var(--ds-text)", border: "none" };
    case "destructive":
      return { ...base, background: "var(--ds-error)", color: "#fff", borderColor: "var(--ds-error)" };
  }
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "var(--ds-input-padding)",
  borderRadius: "var(--ds-radius-md)",
  border: "var(--ds-border-width) solid var(--ds-border)",
  background: "var(--ds-bg)",
  color: "var(--ds-text)",
  fontFamily: "var(--ds-font-body)",
  fontSize: "var(--ds-font-size)",
  fontWeight: "var(--ds-font-weight-normal)" as unknown as number,
  letterSpacing: "var(--ds-letter-spacing)",
  outline: "none",
  boxSizing: "border-box" as const,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "var(--ds-space-4)",
};

const badge = (color?: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "2px var(--ds-space-2)",
  borderRadius: "var(--ds-radius-full)",
  fontSize: "0.75em",
  fontWeight: "var(--ds-font-weight-medium)" as unknown as number,
  fontFamily: "var(--ds-font-body)",
  letterSpacing: "var(--ds-letter-spacing)",
  background: color ?? "var(--ds-accent)",
  color: "var(--ds-bg)",
});

/* ── Showcase sections ── */

function ColorSwatches() {
  const colors = [
    ["primary", "--ds-primary"],
    ["secondary", "--ds-secondary"],
    ["accent", "--ds-accent"],
    ["background", "--ds-bg"],
    ["surface", "--ds-surface"],
    ["text", "--ds-text"],
    ["muted", "--ds-muted"],
    ["border", "--ds-border"],
    ["error", "--ds-error"],
    ["success", "--ds-success"],
    ["warning", "--ds-warning"],
    ["info", "--ds-info"],
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "var(--ds-space-3)" }}>
      {colors.map(([name, v]) => (
        <div key={name} style={{ textAlign: "center" }}>
          <div
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: "var(--ds-radius-md)",
              background: `var(${v})`,
              border: "var(--ds-border-width) solid var(--ds-border)",
              boxShadow: "var(--ds-shadow-sm)",
            }}
          />
          <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginTop: 4, display: "block" }}>
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}

function TypographySamples() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-3)" }}>
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)" }}>h1</span>
        <h1 style={heading(1)}>Heading One</h1>
      </div>
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)" }}>h2</span>
        <h2 style={heading(2)}>Heading Two</h2>
      </div>
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)" }}>h3</span>
        <h3 style={heading(3)}>Heading Three</h3>
      </div>
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)" }}>h4</span>
        <h4 style={heading(4)}>Heading Four</h4>
      </div>
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)" }}>body</span>
        <p style={{ ...body, margin: 0 }}>
          Body text demonstrates the reading experience. Good typography is invisible — it lets the content speak without
          drawing attention to the letterforms themselves.
        </p>
      </div>
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)" }}>caption</span>
        <p style={{ ...body, fontSize: "0.8em", color: "var(--ds-muted)", margin: 0 }}>
          Caption text for supplementary information and metadata.
        </p>
      </div>
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)" }}>code</span>
        <pre style={{ ...mono, background: "var(--ds-surface)", border: "1px solid var(--ds-border)", borderRadius: "var(--ds-radius-md)", padding: "var(--ds-space-3)", margin: 0, overflow: "auto" }}>
          {`const theme = applyTokens(designLanguage);\nrender(<App theme={theme} />);`}
        </pre>
      </div>
    </div>
  );
}

function ButtonShowcase() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-4)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-space-3)", alignItems: "center" }}>
        <button style={btn("primary")}>Primary</button>
        <button style={btn("secondary")}>Secondary</button>
        <button style={btn("outline")}>Outline</button>
        <button style={btn("ghost")}>Ghost</button>
        <button style={btn("destructive")}>Destructive</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-space-3)", alignItems: "center" }}>
        <button style={{ ...btn("primary"), opacity: 0.5, cursor: "not-allowed" }}>Disabled</button>
        <button style={{ ...btn("primary"), padding: "var(--ds-space-1) var(--ds-space-2)", fontSize: "0.75em" }}>Small</button>
        <button style={{ ...btn("primary"), padding: "var(--ds-space-3) var(--ds-space-6)", fontSize: "1em" }}>Large</button>
        <button style={{ ...btn("outline"), borderRadius: "var(--ds-radius-full)", width: 36, height: 36, padding: 0 }}>
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

function FormControls() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-5)" }}>
      {/* Text input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-1)" }}>
        <Label.Root style={{ ...body, fontSize: "0.875em", fontWeight: 500 }}>Email address</Label.Root>
        <input style={input} placeholder="you@example.com" />
      </div>

      {/* Textarea */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-1)" }}>
        <Label.Root style={{ ...body, fontSize: "0.875em", fontWeight: 500 }}>Message</Label.Root>
        <textarea style={{ ...input, minHeight: 80, resize: "vertical" }} placeholder="Write something..." />
      </div>

      {/* Select */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-1)" }}>
        <Label.Root style={{ ...body, fontSize: "0.875em", fontWeight: 500 }}>Category</Label.Root>
        <Select.Root defaultValue="design">
          <Select.Trigger style={{ ...input, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <Select.Value />
            <Select.Icon><ChevronDownIcon /></Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content style={{ ...card, padding: "var(--ds-space-1)", minWidth: 180, zIndex: 50 }} position="popper" sideOffset={4}>
              <Select.Viewport>
                {["design", "development", "research", "strategy"].map((v) => (
                  <Select.Item key={v} value={v} style={{ ...body, fontSize: "0.875em", padding: "var(--ds-space-2) var(--ds-space-3)", borderRadius: "var(--ds-radius-sm)", cursor: "pointer", display: "flex", alignItems: "center", gap: "var(--ds-space-2)", outline: "none" }}>
                    <Select.ItemIndicator><CheckIcon /></Select.ItemIndicator>
                    <Select.ItemText>{v.charAt(0).toUpperCase() + v.slice(1)}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {/* Checkbox */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-3)" }}>
        {["Accept terms", "Subscribe to updates", "Enable notifications"].map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-2)" }}>
            <Checkbox.Root
              defaultChecked={i === 0}
              style={{
                width: 20, height: 20,
                borderRadius: "var(--ds-radius-sm)",
                border: "var(--ds-border-width-strong) solid var(--ds-border-strong)",
                background: "var(--ds-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Checkbox.Indicator style={{ color: "var(--ds-primary)" }}>
                <CheckIcon />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <Label.Root style={{ ...body, fontSize: "0.875em", cursor: "pointer" }}>{label}</Label.Root>
          </div>
        ))}
      </div>

      {/* Radio */}
      <RadioGroup.Root defaultValue="option-a" style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-3)" }}>
        {["Option A", "Option B", "Option C"].map((label) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-2)" }}>
            <RadioGroup.Item
              value={label.toLowerCase().replace(" ", "-")}
              style={{
                width: 20, height: 20,
                borderRadius: "var(--ds-radius-full)",
                border: "var(--ds-border-width-strong) solid var(--ds-border-strong)",
                background: "var(--ds-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <RadioGroup.Indicator style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--ds-primary)" }} />
            </RadioGroup.Item>
            <Label.Root style={{ ...body, fontSize: "0.875em" }}>{label}</Label.Root>
          </div>
        ))}
      </RadioGroup.Root>

      {/* Switch */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-3)" }}>
        {["Dark mode", "Notifications"].map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "var(--ds-space-3)" }}>
            <Switch.Root
              defaultChecked={i === 0}
              style={{
                width: 42, height: 24,
                borderRadius: "var(--ds-radius-full)",
                background: "var(--ds-border)",
                position: "relative",
                cursor: "pointer",
                border: "none",
                padding: 0,
              }}
            >
              <Switch.Thumb
                style={{
                  display: "block",
                  width: 20, height: 20,
                  borderRadius: "var(--ds-radius-full)",
                  background: "var(--ds-bg)",
                  boxShadow: "var(--ds-shadow-sm)",
                  transition: "transform 150ms ease",
                  transform: "translateX(2px)",
                  willChange: "transform",
                }}
              />
            </Switch.Root>
            <Label.Root style={{ ...body, fontSize: "0.875em" }}>{label}</Label.Root>
          </div>
        ))}
      </div>

      {/* Slider */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-1)" }}>
        <Label.Root style={{ ...body, fontSize: "0.875em", fontWeight: 500 }}>Volume</Label.Root>
        <Slider.Root
          defaultValue={[65]}
          max={100}
          step={1}
          style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", height: 20, cursor: "pointer" }}
        >
          <Slider.Track style={{ background: "var(--ds-border)", borderRadius: "var(--ds-radius-full)", height: 4, flexGrow: 1, position: "relative" }}>
            <Slider.Range style={{ position: "absolute", background: "var(--ds-primary)", borderRadius: "var(--ds-radius-full)", height: "100%" }} />
          </Slider.Track>
          <Slider.Thumb style={{ display: "block", width: 18, height: 18, borderRadius: "var(--ds-radius-full)", background: "var(--ds-primary)", boxShadow: "var(--ds-shadow-md)", outline: "none" }} />
        </Slider.Root>
      </div>
    </div>
  );
}

function NavigationShowcase() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-5)" }}>
      {/* Tabs */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>tabs</span>
        <Tabs.Root defaultValue="overview">
          <Tabs.List style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--ds-border)" }}>
            {["Overview", "Components", "Tokens", "Usage"].map((t) => (
              <Tabs.Trigger
                key={t}
                value={t.toLowerCase()}
                style={{
                  ...body, fontSize: "0.875em", fontWeight: 500,
                  padding: "var(--ds-space-2) var(--ds-space-4)",
                  background: "transparent",
                  border: "none",
                  borderBottom: "2px solid transparent",
                  cursor: "pointer",
                  color: "var(--ds-muted)",
                }}
              >
                {t}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="overview" style={{ ...body, fontSize: "0.875em", padding: "var(--ds-space-4) 0", color: "var(--ds-muted)" }}>
            Overview content area with contextual information about the design language.
          </Tabs.Content>
        </Tabs.Root>
      </div>

      {/* Toggle group */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>segmented control</span>
        <ToggleGroup.Root type="single" defaultValue="week" style={{ display: "inline-flex", borderRadius: "var(--ds-radius-md)", border: "var(--ds-border-width-strong) solid var(--ds-border-strong)", overflow: "hidden" }}>
          {["Day", "Week", "Month", "Year"].map((v) => (
            <ToggleGroup.Item
              key={v}
              value={v.toLowerCase()}
              style={{
                ...body, fontSize: "0.8em", fontWeight: 500,
                padding: "var(--ds-space-2) var(--ds-space-3)",
                background: "var(--ds-bg)",
                border: "none",
                borderRight: "1px solid var(--ds-border)",
                cursor: "pointer",
                color: "var(--ds-text)",
              }}
            >
              {v}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>

      {/* Dropdown menu */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>dropdown menu</span>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button style={{ ...btn("outline"), gap: "var(--ds-space-2)" }}>
              <HamburgerMenuIcon /> Menu
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={4}
              style={{ ...card, padding: "var(--ds-space-1)", minWidth: 180, zIndex: 50 }}
            >
              {["Edit", "Duplicate", "Share", "Archive"].map((item) => (
                <DropdownMenu.Item
                  key={item}
                  style={{
                    ...body, fontSize: "0.875em",
                    padding: "var(--ds-space-2) var(--ds-space-3)",
                    borderRadius: "var(--ds-radius-sm)",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {item}
                </DropdownMenu.Item>
              ))}
              <DropdownMenu.Separator style={{ height: 1, background: "var(--ds-border)", margin: "var(--ds-space-1) 0" }} />
              <DropdownMenu.Item style={{ ...body, fontSize: "0.875em", padding: "var(--ds-space-2) var(--ds-space-3)", borderRadius: "var(--ds-radius-sm)", cursor: "pointer", color: "var(--ds-error)", outline: "none" }}>
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}

function FeedbackShowcase() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-4)" }}>
      {/* Badges */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>badges</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--ds-space-2)" }}>
          <span style={badge()}>New</span>
          <span style={badge("var(--ds-primary)")}>Default</span>
          <span style={badge("var(--ds-success)")}>Active</span>
          <span style={badge("var(--ds-warning)")}>Pending</span>
          <span style={badge("var(--ds-error)")}>Error</span>
          <span style={{ ...badge("transparent"), color: "var(--ds-text)", border: "1px solid var(--ds-border)" }}>Outline</span>
        </div>
      </div>

      {/* Alerts */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>alerts</span>
        {[
          { color: "--ds-info", label: "Info", msg: "A new version is available." },
          { color: "--ds-success", label: "Success", msg: "Changes saved successfully." },
          { color: "--ds-warning", label: "Warning", msg: "Storage is almost full." },
          { color: "--ds-error", label: "Error", msg: "Failed to process request." },
        ].map((a) => (
          <div
            key={a.label}
            style={{
              display: "flex", alignItems: "center", gap: "var(--ds-space-3)",
              padding: "var(--ds-space-3) var(--ds-space-4)",
              borderRadius: "var(--ds-radius-md)",
              border: `var(--ds-border-width-strong) solid var(${a.color})`,
              background: "var(--ds-bg)",
              marginBottom: "var(--ds-space-2)",
            }}
          >
            <DotFilledIcon style={{ color: `var(${a.color})`, flexShrink: 0, width: 20, height: 20 }} />
            <div style={{ ...body, fontSize: "0.875em" }}>
              <strong>{a.label}:</strong> {a.msg}
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>progress</span>
        <Progress.Root value={66} style={{ height: 8, borderRadius: "var(--ds-radius-full)", background: "var(--ds-border)", overflow: "hidden" }}>
          <Progress.Indicator style={{ height: "100%", width: "66%", background: "var(--ds-primary)", borderRadius: "var(--ds-radius-full)", transition: "width 300ms ease" }} />
        </Progress.Root>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginTop: 4, display: "block" }}>66% complete</span>
      </div>

      {/* Tooltip */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>tooltip</span>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button style={btn("outline")}>Hover me</button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                sideOffset={4}
                style={{
                  ...body, fontSize: "0.8em",
                  padding: "var(--ds-space-2) var(--ds-space-3)",
                  borderRadius: "var(--ds-radius-md)",
                  background: "var(--ds-text)",
                  color: "var(--ds-bg)",
                  boxShadow: "var(--ds-shadow-md)",
                  zIndex: 50,
                }}
              >
                Tooltip content
                <Tooltip.Arrow style={{ fill: "var(--ds-text)" }} />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>

      {/* Avatar */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>avatar</span>
        <div style={{ display: "flex", gap: "var(--ds-space-3)", alignItems: "center" }}>
          {[["AK", "--ds-primary"], ["JD", "--ds-secondary"], ["ML", "--ds-accent"]].map(([initials, color]) => (
            <Avatar.Root key={initials} style={{ width: 40, height: 40, borderRadius: "var(--ds-radius-full)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: `var(${color})` }}>
              <Avatar.Fallback style={{ ...body, fontSize: "0.8em", fontWeight: 700, color: "var(--ds-bg)" }}>
                {initials}
              </Avatar.Fallback>
            </Avatar.Root>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContainerShowcase() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-5)" }}>
      {/* Card */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>card</span>
        <div style={card}>
          <h4 style={{ ...heading(4), marginBottom: "var(--ds-space-2)" }}>Card Title</h4>
          <p style={{ ...body, fontSize: "0.875em", color: "var(--ds-muted)", margin: 0 }}>
            Cards group related content and actions. This example shows a basic content card with a title and description.
          </p>
          <div style={{ marginTop: "var(--ds-space-4)", display: "flex", gap: "var(--ds-space-2)" }}>
            <button style={btn("primary")}>Action</button>
            <button style={btn("ghost")}>Cancel</button>
          </div>
        </div>
      </div>

      {/* Accordion */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>accordion</span>
        <Accordion.Root type="single" defaultValue="item-1" collapsible>
          {[
            ["item-1", "What are design tokens?", "Design tokens are the atomic values of a design system — colors, spacing, typography, and other values stored as key-value pairs."],
            ["item-2", "How are embodiments generated?", "Embodiments are live component showcases rendered with Radix UI primitives, styled by the design language's token values."],
            ["item-3", "Can I fork a design language?", "Yes. Forking creates an evolution with lineage tracking back to the parent language."],
          ].map(([value, title, content]) => (
            <Accordion.Item key={value} value={value} style={{ borderBottom: "1px solid var(--ds-border)" }}>
              <Accordion.Header>
                <Accordion.Trigger style={{ ...body, fontSize: "0.875em", fontWeight: 600, width: "100%", padding: "var(--ds-space-3) 0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer", color: "var(--ds-text)", textAlign: "left" }}>
                  {title}
                  <ChevronDownIcon style={{ transition: "transform 200ms ease" }} />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content style={{ ...body, fontSize: "0.875em", color: "var(--ds-muted)", paddingBottom: "var(--ds-space-4)", overflow: "hidden" }}>
                {content}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>

      {/* Dialog */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>dialog</span>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <button style={btn("outline")}>Open Dialog</button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50 }} />
            <Dialog.Content style={{ ...card, position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "90%", maxWidth: 440, zIndex: 51, boxShadow: "var(--ds-shadow-lg)" }}>
              <Dialog.Title style={heading(3)}>Confirm Action</Dialog.Title>
              <Dialog.Description style={{ ...body, fontSize: "0.875em", color: "var(--ds-muted)", margin: "var(--ds-space-3) 0 var(--ds-space-5)" }}>
                This action cannot be undone. Are you sure you want to proceed?
              </Dialog.Description>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--ds-space-2)" }}>
                <Dialog.Close asChild>
                  <button style={btn("ghost")}>Cancel</button>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <button style={btn("primary")}>Confirm</button>
                </Dialog.Close>
              </div>
              <Dialog.Close asChild>
                <button style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", cursor: "pointer", color: "var(--ds-muted)" }}>
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Separator */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>separator</span>
        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />
      </div>
    </div>
  );
}

function DataShowcase() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ds-space-5)" }}>
      {/* Table */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>table</span>
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", ...body, fontSize: "0.875em" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ds-border)" }}>
                {["Name", "Status", "Category", "Score"].map((h) => (
                  <th key={h} style={{ padding: "var(--ds-space-3) var(--ds-space-4)", textAlign: "left", fontWeight: "var(--ds-font-weight-medium)" as unknown as number, color: "var(--ds-muted)", fontSize: "0.8em", textTransform: "var(--ds-heading-transform)" as React.CSSProperties["textTransform"], letterSpacing: "var(--ds-letter-spacing-wide)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Neo Brutalism", "Published", "Maximalist", "94"],
                ["Aero Glass", "Draft", "Spatial", "87"],
                ["Signal UI", "Review", "Enterprise", "91"],
              ].map(([name, status, cat, score]) => (
                <tr key={name} style={{ borderBottom: "1px solid var(--ds-border)" }}>
                  <td style={{ padding: "var(--ds-space-3) var(--ds-space-4)", fontWeight: 500 }}>{name}</td>
                  <td style={{ padding: "var(--ds-space-3) var(--ds-space-4)" }}>
                    <span style={badge(status === "Published" ? "var(--ds-success)" : status === "Draft" ? "var(--ds-muted)" : "var(--ds-warning)")}>{status}</span>
                  </td>
                  <td style={{ padding: "var(--ds-space-3) var(--ds-space-4)", color: "var(--ds-muted)" }}>{cat}</td>
                  <td style={{ padding: "var(--ds-space-3) var(--ds-space-4)", ...mono }}>{score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stat cards */}
      <div>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", marginBottom: 4, display: "block" }}>stat cards</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--ds-space-3)" }}>
          {[
            ["Languages", "42", "+12%"],
            ["Elements", "3,150", "+8%"],
            ["Usage", "18.4k", "+23%"],
          ].map(([label, value, change]) => (
            <div key={label} style={card}>
              <span style={{ ...body, fontSize: "0.75em", color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
              <div style={{ ...heading(2), marginTop: "var(--ds-space-1)" }}>{value}</div>
              <span style={{ ...body, fontSize: "0.75em", color: "var(--ds-success)" }}>{change}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main showcase ── */

export function DesignShowcase({ tokensRaw, languageName }: DesignShowcaseProps) {
  const tokens = useMemo(() => parseJson<Tokens>(tokensRaw) ?? {}, [tokensRaw]);
  const cssVars = useMemo(() => buildCssVars(tokens), [tokens]);

  return (
    <div
      style={{
        ...cssVars,
        background: "var(--ds-bg)",
        color: "var(--ds-text)",
        fontFamily: "var(--ds-font-body)",
        fontSize: "var(--ds-font-size)",
        lineHeight: "var(--ds-line-height)",
        borderRadius: "var(--ds-radius-lg)",
        border: "1px solid var(--ds-border)",
        overflow: "hidden",
      }}
    >
      {/* Hero header */}
      <div style={{ padding: "var(--ds-space-6)", borderBottom: "1px solid var(--ds-border)" }}>
        <span style={{ ...mono, fontSize: "0.7em", color: "var(--ds-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Design Language Preview
        </span>
        <h1 style={{ ...heading(1), marginTop: "var(--ds-space-2)" }}>
          {languageName ?? "Untitled"}
        </h1>
      </div>

      <div style={{ padding: "var(--ds-space-6)", display: "flex", flexDirection: "column", gap: "var(--ds-space-6)" }}>
        {/* Colors */}
        <section>
          <h3 style={sectionTitle}>Color Palette</h3>
          <ColorSwatches />
        </section>

        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />

        {/* Typography */}
        <section>
          <h3 style={sectionTitle}>Typography</h3>
          <TypographySamples />
        </section>

        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />

        {/* Buttons */}
        <section>
          <h3 style={sectionTitle}>Buttons</h3>
          <ButtonShowcase />
        </section>

        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />

        {/* Form controls */}
        <section>
          <h3 style={sectionTitle}>Form Controls</h3>
          <FormControls />
        </section>

        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />

        {/* Navigation */}
        <section>
          <h3 style={sectionTitle}>Navigation</h3>
          <NavigationShowcase />
        </section>

        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />

        {/* Feedback */}
        <section>
          <h3 style={sectionTitle}>Feedback &amp; Status</h3>
          <FeedbackShowcase />
        </section>

        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />

        {/* Containers */}
        <section>
          <h3 style={sectionTitle}>Containers &amp; Overlays</h3>
          <ContainerShowcase />
        </section>

        <Separator.Root style={{ height: 1, background: "var(--ds-border)" }} />

        {/* Data */}
        <section>
          <h3 style={sectionTitle}>Data Display</h3>
          <DataShowcase />
        </section>
      </div>
    </div>
  );
}
