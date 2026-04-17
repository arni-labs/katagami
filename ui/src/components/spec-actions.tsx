"use client";

import { useState } from "react";
import { Download, Copy, Check } from "lucide-react";

interface SpecActionsProps {
  markdown: string;
  slug?: string;
}

export function SpecActions({ markdown, slug }: SpecActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = markdown;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug || "spec"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className="group relative inline-flex items-center gap-1.5 border border-border bg-white/85 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70 shadow-[0_1px_2px_rgba(30,35,45,0.06)] transition-colors hover:bg-white hover:text-foreground"
        style={{ transform: "rotate(-1deg)" }}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-40"
          style={{
            background: "color-mix(in oklch, var(--yuzu) 55%, white)",
          }}
        />
        <span className="relative flex items-center gap-1.5">
          {copied ? (
            <Check className="h-3 w-3 text-[var(--salad)]" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          {copied ? "copied" : "copy"}
        </span>
      </button>
      <button
        type="button"
        onClick={handleDownload}
        className="group relative inline-flex items-center gap-1.5 border border-border bg-white/85 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70 shadow-[0_1px_2px_rgba(30,35,45,0.06)] transition-colors hover:bg-white hover:text-foreground"
        style={{ transform: "rotate(1deg)" }}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-30 transition-opacity group-hover:opacity-40"
          style={{
            background: "color-mix(in oklch, var(--teal) 55%, white)",
          }}
        />
        <span className="relative flex items-center gap-1.5">
          <Download className="h-3 w-3" />
          download
        </span>
      </button>
    </div>
  );
}
