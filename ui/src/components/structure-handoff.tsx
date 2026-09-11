"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { trackCopy } from "@/lib/analytics";

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // A non-secure origin may expose the API but refuse the call.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const copied = document.execCommand("copy");
  area.remove();
  return copied;
}

export function StructureHandoff({ text, id, name }: { text: string; id: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);

  return (
    <section
      className="sticker-card p-5 sm:p-7"
      style={{
        ["--card-ink" as string]: "var(--ramune)",
        background: "color-mix(in srgb, var(--ramune) 7%, var(--paper-tint-base))",
      }}
    >
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span aria-hidden className="inline-block h-[3px] w-6 bg-[var(--ramune)]" />
        use this structure
      </div>
      <h2 className="font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[30px]">
        Give the outline to an agent
      </h2>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-foreground">
        Copy the instruction and its ordered movements, then paste them before your brief. The agent receives a plan to fill in before drafting.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            if (!(await copyText(text))) return;
            trackCopy({
              artifact: "narrative-structure-agent-handoff",
              languageId: id,
              languageName: name,
              label: "Copy outline for your agent",
            });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex h-11 items-center gap-2 bg-foreground px-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-transform hover:-translate-y-[2px] motion-reduce:transition-none"
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? "Copied" : "Copy outline for your agent"}
        </button>
        <button
          type="button"
          onClick={() => setShown((current) => !current)}
          aria-expanded={shown}
          className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground"
        >
          {shown ? "Hide the copied text" : "Read the copied text"}
        </button>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
          {text.length.toLocaleString()} characters
        </span>
      </div>
      {shown ? (
        <pre className="mt-5 max-h-[420px] overflow-auto whitespace-pre-wrap bg-[var(--paper-sticker)] p-4 font-mono text-[13px] leading-relaxed text-foreground shadow-[var(--shadow-sticker)]">
          {text}
        </pre>
      ) : null}
    </section>
  );
}
