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

  const accent = ACCENT[format];
  const filename = URL_SUFFIX[format];

  return (
    <div className="relative inline-block">
      {/* Washi tape pinning the packet's top-left corner */}
      <span
        aria-hidden
        className="washi-tape absolute -left-3 -top-2 z-10"
        style={{
          width: "62px",
          height: "14px",
          transform: "rotate(-6deg)",
          background: `repeating-linear-gradient(45deg, color-mix(in oklch, var(--${accent}) 70%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--${accent}) 30%, var(--paper-tape-mix)) 6px 12px)`,
        }}
      />

      <div className="relative flex flex-col gap-0 border border-border bg-card/70 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)]">
        {/* Tab strip — two filing tabs, active one tilts forward */}
        <div className="flex items-end gap-1 px-2 pt-2">
          <FormatTab
            active={format === "katagami"}
            onClick={() => setFormat("katagami")}
            accent="sumire"
            kanji
          >
            katagami
          </FormatTab>
          <FormatTab
            active={format === "design-md"}
            onClick={() => setFormat("design-md")}
            accent="salad"
          >
            DESIGN.md
          </FormatTab>
          <span className="ml-auto pb-1 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground/60">
            spec
          </span>
        </div>

        {/* Perforation between tabs and actions */}
        <div className="sticker-perforation mx-3" />

        {/* Target line + action stamps — re-keys on format change */}
        <div
          key={format}
          className="anim-packet-body flex flex-col gap-2 px-3 py-3"
        >
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/85">
            <HandArrow accent={accent} />
            <span className="relative inline-flex items-center font-semibold text-foreground">
              <span
                aria-hidden
                className="absolute inset-x-[-3px] bottom-[1px] z-0 h-[6px] rounded-[1px]"
                style={{
                  background: `var(--${accent})`,
                  opacity: 0.85,
                  transform: "rotate(-0.4deg)",
                }}
              />
              <span className="relative z-10">{filename}</span>
            </span>
          </div>

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
      </div>

      <style>{`
        @keyframes katagami-packet-pop {
          0% { opacity: 0; transform: translateY(-3px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .anim-packet-body { animation: katagami-packet-pop 280ms cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>
    </div>
  );
}

// A filing-tab style toggle button. Active tab tilts forward with a
// marker wash; inactive tab sits back, muted. Katagami tab gets the
// 型紙 kanji prefix.
function FormatTab({
  active,
  onClick,
  accent,
  kanji,
  children,
}: {
  active: boolean;
  onClick: () => void;
  accent: string;
  kanji?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative inline-flex items-center gap-1.5 border px-2.5 py-1 transition-all duration-200 ${
        active
          ? "z-10 border-border bg-card text-foreground shadow-[0_-1px_2px_rgba(30,35,45,0.04)]"
          : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/70 hover:text-foreground"
      }`}
      style={{
        transform: active ? "translateY(0) rotate(-0.5deg)" : "translateY(2px)",
        borderBottom: active ? "1px solid transparent" : undefined,
      }}
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-1 bottom-[3px] z-0 h-[5px] rounded-[1px]"
          style={{
            background: `var(--${accent})`,
            opacity: 0.85,
            transform: "rotate(-0.5deg)",
          }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-1.5">
        {kanji && (
          <span
            aria-hidden
            className="font-bold leading-none"
            style={{
              fontFamily: '"Noto Serif JP", "Bricolage Grotesque", serif',
              fontSize: 13,
              color: active ? "var(--sumire)" : "var(--muted-foreground)",
            }}
          >
            型紙
          </span>
        )}
        <span className="font-display text-[12px] font-semibold leading-none">
          {children}
        </span>
        {kanji && active && (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5 text-[var(--yuzu)]"
            fill="currentColor"
            aria-hidden
          >
            <path d="M6 0.5 L7 4.9 L11.5 6 L7 7.1 L6 11.5 L5 7.1 L0.5 6 L5 4.9 Z" />
          </svg>
        )}
      </span>
    </button>
  );
}

// Hand-drawn squiggle arrow pointing from tabs down to the filename.
// Re-renders via the parent's `key={format}` so it re-animates on switch.
function HandArrow({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 24 14"
      className="h-3 w-5"
      fill="none"
      stroke={`var(--${accent})`}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M 2 2 Q 7 4, 9 7 T 18 11" />
      <path d="M 16 8 L 18 11 L 14 11" />
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
