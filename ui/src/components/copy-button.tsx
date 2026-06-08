"use client";

import { useState } from "react";

/** Minimal katagami copy button (no emoji). Shows "Copied" briefly on click. */
export function CopyButton({
  text,
  label,
  variant = "outline",
}: {
  text: string;
  label: string;
  variant?: "outline" | "ink";
}) {
  const [copied, setCopied] = useState(false);
  const base =
    "rounded-[var(--radius-md)] px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50";
  const cls =
    variant === "ink"
      ? `${base} bg-foreground text-background hover:opacity-90`
      : `${base} border border-border bg-card text-foreground hover:border-foreground/40`;
  return (
    <button
      type="button"
      className={cls}
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
