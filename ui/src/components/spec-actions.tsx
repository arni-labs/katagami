"use client";

import { useState } from "react";
import { Download, Copy, Link2, Check } from "lucide-react";

interface SpecActionsProps {
  languageId?: string;
  katagamiSpec: string;
  designMd: string;
  shadcnTheme: string;
  shadcnDesignMd?: string;
  slug?: string;
  variant?: "compact" | "hero";
}

type Format = "katagami" | "design-md" | "shadcn-md";
type CopyKind = "copy" | "link";

const PREAMBLE: Record<Format, string> = {
  katagami:
    "Use the following Katagami design-language spec as the source of truth for every UI we build. " +
    "Follow its philosophy, tokens, rules, layout guidance, and do/don't guardrails.",
  "design-md":
    "Use the following DESIGN.md as the portable design-system source of truth for every UI we build. " +
    "Follow its YAML tokens, component guidance, layout rules, and do/don't guardrails.",
  "shadcn-md":
    "Use the following DESIGN.md for a shadcn/ui project. It includes the Katagami design language plus shadcn/ui install, theme, component recipe, preview-shot, and starter TSX guidance.",
};

const FILENAME_SUFFIX: Record<Format, string> = {
  katagami: "KATAGAMI",
  "design-md": "DESIGN",
  "shadcn-md": "DESIGN.with-shadcn",
};

const URL_SUFFIX: Record<Format, string> = {
  katagami: "KATAGAMI.MD",
  "design-md": "DESIGN.md",
  "shadcn-md": "DESIGN.with-shadcn.md",
};

const DISPLAY_FILENAME: Record<Format, string> = {
  katagami: "KATAGAMI.MD",
  "design-md": "DESIGN.md",
  "shadcn-md": "DESIGN.md",
};

const ACCENT: Record<Format, string> = {
  katagami: "sumire",
  "design-md": "sakura",
  "shadcn-md": "ramune",
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
  shadcnDesignMd,
  slug,
  variant = "compact",
}: SpecActionsProps) {
  const [format, setFormat] = useState<Format>("design-md");
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
    f === "katagami"
      ? katagamiSpec
      : f === "design-md"
        ? designMd
        : shadcnDesignMd ?? designMd;

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
  const displayFilename = DISPLAY_FILENAME[format];
  const actionTitle =
    format === "shadcn-md"
      ? "DESIGN.md with shadcn/ui"
      : displayFilename;

  if (variant === "hero") {
    return (
      <div className="relative">
        <div className="relative overflow-hidden bg-card/85 px-5 py-5 shadow-[0_1px_2px_rgba(30,35,45,0.05),0_10px_28px_rgba(30,35,45,0.08)] sm:px-6">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[5px]"
            style={{ background: `var(--${accent})` }}
          />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <div className="mb-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <FormatTab
                    active={format === "design-md"}
                    onClick={() => setFormat("design-md")}
                    accent="sakura"
                  >
                    DESIGN.md
                  </FormatTab>
                  <FormatTab
                    active={format === "shadcn-md"}
                    onClick={() => setFormat("shadcn-md")}
                    accent="ramune"
                  >
                    with shadcn
                  </FormatTab>
                  <FormatTab
                    active={format === "katagami"}
                    onClick={() => setFormat("katagami")}
                    accent="sumire"
                    kanji
                  >
                    katagami
                  </FormatTab>
                </div>
                <h2 className="font-display text-[26px] font-bold leading-none tracking-[-0.025em] sm:text-[32px]">
                  Download {displayFilename}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {format === "shadcn-md"
                    ? "For shadcn/ui projects: the same DESIGN.md source plus install, theme, recipes, preview contract, and starter TSX in one Markdown file."
                    : format === "katagami"
                        ? "Native Katagami source spec with the richest token and language context."
                        : "Portable DESIGN.md source of truth for most agents and apps."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="group inline-flex cursor-pointer items-center gap-2 bg-foreground px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[-1deg]"
                title={`Download ${actionTitle}`}
              >
                <Download className="h-4 w-4" />
                download
              </button>
              <ActionStamp
                onClick={handleCopy}
                tint="yuzu"
                rotate={0.5}
                icon={
                  justCopied === "copy" ? (
                    <Check className="h-3 w-3 text-[var(--foreground)]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )
                }
                label={justCopied === "copy" ? "copied" : "copy"}
                title="Copy with prompt preamble"
              />
              <ActionStamp
                onClick={handleCopyLink}
                tint="sumire"
                rotate={-0.5}
                icon={
                  justCopied === "link" ? (
                    <Check className="h-3 w-3 text-[var(--foreground)]" />
                  ) : (
                    <Link2 className="h-3 w-3" />
                  )
                }
                label={justCopied === "link" ? "link copied" : "link"}
                title="Copy raw artifact URL"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div className="relative flex flex-col gap-2 bg-card/70 px-3 pb-3 pt-2 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)]">
        {/* Tab strip — active one tilts forward */}
        <div className="flex items-end gap-2">
          <FormatTab
            active={format === "design-md"}
            onClick={() => setFormat("design-md")}
            accent="sakura"
          >
            DESIGN.md
          </FormatTab>
          <FormatTab
            active={format === "shadcn-md"}
            onClick={() => setFormat("shadcn-md")}
            accent="ramune"
          >
            with shadcn
          </FormatTab>
          <FormatTab
            active={format === "katagami"}
            onClick={() => setFormat("katagami")}
            accent="sumire"
            kanji
          >
            katagami
          </FormatTab>
        </div>

        {/* Action stamps — re-keys on format change for the slide-in animation.
            The filename is already in the active tab above; here we just use a
            cute hand-drawn arrow pointing down to the stamps. */}
        <div
          key={format}
          className="anim-packet-body flex items-center gap-2.5"
        >
          <HandArrow accent={accent} />
          <div className="flex flex-wrap items-center gap-1.5">
            <ActionStamp
              onClick={handleCopy}
              tint="yuzu"
              rotate={-1.5}
              icon={
                justCopied === "copy" ? (
                  <Check className="h-3 w-3 text-[var(--foreground)]" />
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
                  <Check className="h-3 w-3 text-[var(--foreground)]" />
                ) : (
                  <Link2 className="h-3 w-3" />
                )
              }
              label={justCopied === "link" ? "link copied" : "link"}
              title="Copy raw artifact URL — agents can fetch it directly"
            />
            <ActionStamp
              onClick={handleDownload}
              tint="teal"
              rotate={1}
              icon={<Download className="h-3 w-3" />}
              label="download"
              title="Download current artifact"
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
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 transition-all duration-200 ${
        active
          ? "z-10 text-foreground"
          : "text-muted-foreground/80 hover:text-foreground"
      }`}
      style={{
        transform: active ? "rotate(-0.6deg)" : undefined,
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
      className="group relative inline-flex cursor-pointer items-center gap-1.5 bg-card/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/75 shadow-[0_1px_0_rgba(30,35,45,0.06),0_2px_6px_rgba(30,35,45,0.05)] transition-all duration-200 [transform:rotate(var(--stamp-rotate))] hover:text-foreground hover:shadow-[0_2px_0_rgba(30,35,45,0.08),0_7px_14px_rgba(30,35,45,0.08)] hover:[transform:translateY(-2px)_rotate(var(--stamp-hover-rotate))]"
      style={
        {
          "--stamp-rotate": `${rotate}deg`,
          "--stamp-hover-rotate": `${rotate - 1}deg`,
        } as React.CSSProperties
      }
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
