"use client";

import { useState } from "react";
import { KX_BTN_INK, KX_BTN_PAPER } from "@/lib/katagami-ui";
import { trackCopy } from "@/lib/analytics";

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Local/non-secure previews can expose the Clipboard API but deny use.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

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
      onClick={async () => {
        const didCopy = await copyText(text);
        if (!didCopy) return;
        trackCopy({ artifact: artifact ?? label, languageId, languageName, paletteId, label });
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
