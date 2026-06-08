"use client";

import { useState } from "react";
import { KX_BTN_INK, KX_BTN_PAPER } from "@/lib/katagami-ui";

/** Minimal katagami copy button (no emoji, no grey border). */
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
  return (
    <button
      type="button"
      className={variant === "ink" ? KX_BTN_INK : KX_BTN_PAPER}
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
