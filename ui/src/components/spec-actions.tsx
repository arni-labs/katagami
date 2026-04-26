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

const FORMAT_LABEL: Record<Format, string> = {
  katagami: "katagami",
  "design-md": "DESIGN.md",
};

const FILENAME_SUFFIX: Record<Format, string> = {
  katagami: "katagami-spec",
  "design-md": "DESIGN",
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
  const [format, setFormat] = useState<Format>("design-md");
  const [justCopied, setJustCopied] = useState<CopyKind | null>(null);

  const flash = (kind: CopyKind) => {
    setJustCopied(kind);
    setTimeout(() => setJustCopied(null), 2000);
  };

  const designMdUrl = () => {
    if (typeof window === "undefined") return "";
    if (languageId) {
      return `${window.location.origin}/language/${encodeURIComponent(languageId)}/DESIGN.md`;
    }
    const path = window.location.pathname.replace(/\/+$/, "");
    return `${window.location.origin}${path}/DESIGN.md`;
  };

  const markdownFor = (f: Format) =>
    f === "katagami" ? katagamiSpec : designMd;

  const handleCopy = async () => {
    const md = markdownFor(format);
    const url = designMdUrl();
    const refLine = url ? `\n\nSource: ${url}` : "";
    await writeClipboard(`${PREAMBLE[format]}${refLine}\n\n${md}`);
    flash("copy");
  };

  const handleCopyLink = async () => {
    const url = designMdUrl();
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <FormatToggle value={format} onChange={setFormat} />
      <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
      <div className="flex items-center gap-1.5">
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
          title={`Copy ${FORMAT_LABEL[format]} with a prompt preamble`}
        />
        {format === "design-md" && (
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
            title="Copy raw DESIGN.md URL — agents can fetch it directly"
          />
        )}
        <ActionStamp
          onClick={handleDownload}
          tint="teal"
          rotate={1}
          icon={<Download className="h-3 w-3" />}
          label="download"
          title={`Download ${FORMAT_LABEL[format]}`}
        />
      </div>
    </div>
  );
}

function FormatToggle({
  value,
  onChange,
}: {
  value: Format;
  onChange: (v: Format) => void;
}) {
  const options: Format[] = ["katagami", "design-md"];
  return (
    <div className="inline-flex items-center gap-1 border border-border bg-card/85 px-1 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] shadow-[0_1px_2px_rgba(30,35,45,0.06)]">
      <span className="px-1.5 text-muted-foreground/80">format</span>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className={`relative px-2 py-0.5 transition-colors ${
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-[1px] -z-0 h-[5px] rounded-[1px] bg-[var(--yuzu)]"
                style={{ transform: "rotate(-0.6deg)", opacity: 0.85 }}
              />
            )}
            <span className="relative">{FORMAT_LABEL[opt]}</span>
          </button>
        );
      })}
    </div>
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
