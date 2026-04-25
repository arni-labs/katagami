"use client";

import { useState } from "react";
import { Download, Copy, Link2, Check } from "lucide-react";

interface SpecActionsProps {
  designMd: string;
  slug?: string;
}

type CopyKind = "design-md" | "link";

const PROMPT_PREAMBLE =
  "Use the following DESIGN.md as the source of truth for every UI we build. " +
  "Follow its tokens, component guidance, layout rules, and do/don't guardrails.";

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

export function SpecActions({ designMd, slug }: SpecActionsProps) {
  const [justCopied, setJustCopied] = useState<CopyKind | null>(null);

  const flash = (kind: CopyKind) => {
    setJustCopied(kind);
    setTimeout(() => setJustCopied(null), 2000);
  };

  const designMdUrl = () => {
    if (typeof window === "undefined") return "";
    const path = window.location.pathname.replace(/\/+$/, "");
    return `${window.location.origin}${path}/DESIGN.md`;
  };

  const handleCopyDesignMd = async () => {
    const url = designMdUrl();
    const body = url
      ? `${PROMPT_PREAMBLE}\n\nSource: ${url}\n\n${designMd}`
      : `${PROMPT_PREAMBLE}\n\n${designMd}`;
    await writeClipboard(body);
    flash("design-md");
  };

  const handleCopyLink = async () => {
    const url = designMdUrl();
    if (!url) return;
    await writeClipboard(url);
    flash("link");
  };

  const handleDownload = () => {
    const blob = new Blob([designMd], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = slug ? `${slug}-DESIGN.md` : "DESIGN.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ActionStamp
        onClick={handleCopyDesignMd}
        tint="yuzu"
        rotate={-1.5}
        icon={
          justCopied === "design-md" ? (
            <Check className="h-3 w-3 text-[var(--salad)]" />
          ) : (
            <Copy className="h-3 w-3" />
          )
        }
        label={justCopied === "design-md" ? "copied" : "copy DESIGN.md"}
        title="Copy the Google DESIGN.md-compatible export for agent chats"
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
        label={justCopied === "link" ? "link copied" : "copy link"}
        title="Copy raw DESIGN.md URL — agents can fetch it directly"
      />
      <ActionStamp
        onClick={handleDownload}
        tint="teal"
        rotate={1}
        icon={<Download className="h-3 w-3" />}
        label="download"
        title="Download DESIGN.md"
      />
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
