"use client";

import { useState } from "react";
import { Download, Copy, Link2, Check } from "lucide-react";

interface SpecActionsProps {
  languageId?: string;
  katagamiSpec: string;
  designMd: string;
  slug?: string;
}

type Format = "katagami" | "design-md";
type CopyKind = "copy" | "link";

const PREAMBLE: Record<Format, string> = {
  katagami:
    "Use the following Katagami design-language spec as the source of truth for every UI we build. " +
    "Follow its philosophy, tokens, rules, layout guidance, and do/don't guardrails.",
  "design-md":
    "Use the following DESIGN.md as the portable design-system source of truth for every UI we build. " +
    "Follow its YAML tokens, component guidance, layout rules, and do/don't guardrails.",
};

const FILENAME_SUFFIX: Record<Format, string> = {
  katagami: "katagami-spec",
  "design-md": "DESIGN",
};

const URL_SUFFIX: Record<Format, string> = {
  katagami: "SPEC.md",
  "design-md": "DESIGN.md",
};

const ACCENT: Record<Format, string> = {
  katagami: "sumire",
  "design-md": "salad",
};

async function writeClipboard(text: string) {
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

export function SpecActions({
  languageId,
  katagamiSpec,
  designMd,
  slug,
}: SpecActionsProps) {
  const [format, setFormat] = useState<Format>("katagami");
  const [justCopied, setJustCopied] = useState<CopyKind | null>(null);

  const flash = (kind: CopyKind) => {
    setJustCopied(kind);
    setTimeout(() => setJustCopied(null), 2000);
  };

  const urlFor = (f: Format) => {
    if (typeof window === "undefined") return "";
    const suffix = URL_SUFFIX[f];
    if (languageId) {
      return `${window.location.origin}/language/${encodeURIComponent(languageId)}/${suffix}`;
    }
    const path = window.location.pathname.replace(/\/+$/, "");
    return `${window.location.origin}${path}/${suffix}`;
  };

  const markdownFor = (f: Format) =>
    f === "katagami" ? katagamiSpec : designMd;

  const handleCopy = async () => {
    const md = markdownFor(format);
    const url = urlFor(format);
    const refLine = url ? `\n\nSource: ${url}` : "";
    await writeClipboard(`${PREAMBLE[format]}${refLine}\n\n${md}`);
    flash("copy");
  };

  const handleCopyLink = async () => {
    const url = urlFor(format);
    if (!url) return;
    await writeClipboard(url);
    flash("link");
  };

  const handleDownload = () => {
    const blob = new Blob([markdownFor(format)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = slug
      ? `${slug}-${FILENAME_SUFFIX[format]}.md`
      : `${FILENAME_SUFFIX[format]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <FormatSelector value={format} onChange={setFormat} />
      <div
        key={format}
        className="anim-format-row relative flex flex-wrap items-center gap-2 pl-2.5"
        style={{
          borderLeft: `2px solid var(--${ACCENT[format]})`,
        }}
      >
        <FormatTarget format={format} />
        <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
        <div className="flex flex-wrap items-center gap-1.5">
          <ActionStamp
            onClick={handleCopy}
            tint="yuzu"
            rotate={-1.5}
            icon={
              justCopied === "copy" ? (
                <Check className="h-3 w-3 text-[var(--salad)]" />
              ) : (
                <Copy className="h-3 w-3" />
              )
            }
            label={justCopied === "copy" ? "copied" : "copy"}
            title="Copy with prompt preamble — paste into any agent chat"
          />
          <ActionStamp
            onClick={handleCopyLink}
            tint="sumire"
            rotate={0.5}
            icon={
              justCopied === "link" ? (
                <Check className="h-3 w-3 text-[var(--salad)]" />
              ) : (
                <Link2 className="h-3 w-3" />
              )
            }
            label={justCopied === "link" ? "link copied" : "link"}
            title="Copy raw markdown URL — agents can fetch it directly"
          />
          <ActionStamp
            onClick={handleDownload}
            tint="teal"
            rotate={1}
            icon={<Download className="h-3 w-3" />}
            label="download"
            title="Download .md file"
          />
        </div>
      </div>
      <style>{`
        @keyframes katagami-format-pop {
          0% { opacity: 0; transform: translateY(-2px) scale(0.97); }
          60% { opacity: 1; transform: translateY(0) scale(1.01); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .anim-format-row { animation: katagami-format-pop 280ms cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes katagami-target-pulse {
          0% { opacity: 0; transform: translateX(-3px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .anim-format-target { animation: katagami-target-pulse 320ms cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </div>
  );
}

// Persistent target indicator: shows what file the action stamps will produce.
// Re-keyed via parent's `key={format}` so the entrance animation re-runs
// every time the format flips.
function FormatTarget({ format }: { format: Format }) {
  const filename = URL_SUFFIX[format];
  const accent = ACCENT[format];
  return (
    <span
      className="anim-format-target inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em]"
      title={`Actions target the ${filename} format`}
    >
      <span className="text-muted-foreground/70" aria-hidden>
        →
      </span>
      <span className="relative inline-flex items-center font-semibold text-foreground">
        <span
          aria-hidden
          className="absolute inset-x-[-2px] bottom-0 z-0 h-[5px] rounded-[1px]"
          style={{
            background: `var(--${accent})`,
            opacity: 0.85,
            transform: "rotate(-0.4deg)",
          }}
        />
        <span className="relative z-10">{filename}</span>
      </span>
    </span>
  );
}

// Two-tab format selector. Katagami tab gets the 型紙 kanji + a sparkle,
// active state shows a marker wash behind the label.
function FormatSelector({
  value,
  onChange,
}: {
  value: Format;
  onChange: (v: Format) => void;
}) {
  return (
    <div className="inline-flex items-stretch self-start border border-border bg-card/85 shadow-[0_1px_2px_rgba(30,35,45,0.06)]">
      <span className="flex items-center px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/80">
        format
      </span>
      <span aria-hidden className="w-px self-stretch bg-border" />
      <FormatTab
        active={value === "katagami"}
        onClick={() => onChange("katagami")}
        markerColor="sumire"
      >
        <span
          aria-hidden
          className="font-display text-[14px] font-bold leading-none text-[var(--sumire)]"
          style={{ fontFamily: '"Noto Serif JP", "Bricolage Grotesque", serif' }}
        >
          型紙
        </span>
        <span className="font-display text-[12px] font-semibold leading-none">
          katagami
        </span>
        <Sparkle />
      </FormatTab>
      <span aria-hidden className="w-px self-stretch bg-border" />
      <FormatTab
        active={value === "design-md"}
        onClick={() => onChange("design-md")}
        markerColor="salad"
      >
        <span className="font-mono text-[12px] font-semibold leading-none tracking-tight">
          DESIGN.md
        </span>
      </FormatTab>
    </div>
  );
}

function FormatTab({
  active,
  onClick,
  markerColor,
  children,
}: {
  active: boolean;
  onClick: () => void;
  markerColor: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-1 bottom-[3px] -z-0 h-[6px] rounded-[1px]"
          style={{
            background: `var(--${markerColor})`,
            opacity: 0.85,
            transform: "rotate(-0.4deg)",
          }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </button>
  );
}

function Sparkle() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="h-2.5 w-2.5 text-[var(--yuzu)]"
      fill="currentColor"
      aria-hidden
    >
      <path d="M6 0.5 L7 4.9 L11.5 6 L7 7.1 L6 11.5 L5 7.1 L0.5 6 L5 4.9 Z" />
    </svg>
  );
}

function ActionStamp({
  onClick,
  tint,
  rotate,
  icon,
  label,
  title,
}: {
  onClick: () => void;
  tint: string;
  rotate: number;
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="group relative inline-flex items-center gap-1.5 border border-border bg-card/85 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70 shadow-[0_1px_2px_rgba(30,35,45,0.06)] transition-colors hover:bg-card hover:text-foreground"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-40"
        style={{
          background: `color-mix(in oklch, var(--${tint}) 55%, var(--paper-tape-mix))`,
        }}
      />
      <span className="relative flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}
