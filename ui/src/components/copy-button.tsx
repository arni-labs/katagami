"use client";

import { useState } from "react";
import { KX_BTN_INK, KX_BTN_PAPER } from "@/lib/katagami-ui";
import { trackCopy } from "@/lib/analytics";

/** Minimal katagami copy button (no emoji, no grey border). */
export function CopyButton({
  text,
  label,
  variant = "outline",
  artifact,
  languageId,
  languageName,
  paletteId,
}: {
  text: string;
  label: string;
  variant?: "outline" | "ink";
  /** What is being copied, for analytics (falls back to `label`). */
  artifact?: string;
  languageId?: string;
  languageName?: string;
  paletteId?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={variant === "ink" ? KX_BTN_INK : KX_BTN_PAPER}
      onClick={() => {
        void navigator.clipboard.writeText(text);
        trackCopy({ artifact: artifact ?? label, languageId, languageName, paletteId, label });
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
