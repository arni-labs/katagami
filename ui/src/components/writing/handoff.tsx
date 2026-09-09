"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { trackCopy } from "@/lib/analytics";

// Handing a style to an agent.
//
// A design language travels as a URL to its DESIGN.md. A voice cannot travel
// that way yet: `/voice/<id>/VOICE.md` is owner-gated, so an agent following
// the link is answered with a 404. What does work from any harness is a paste,
// so the one action here puts the whole contract on the clipboard with a
// sentence saying what to do with it, and the address rides along inside the
// block for when the lane publishes.

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // A non-secure origin exposes the API and denies the call.
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

export function AgentHandoff({ handoff, name, id, words }: { handoff: string; name: string; id: string; words: number }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <section className="sticker-card p-5 sm:p-7" style={{ ["--card-ink" as string]: "var(--ramune)", background: "color-mix(in srgb, var(--ramune) 7%, var(--paper-tint-base))" }}>
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <span aria-hidden className="inline-block h-[3px] w-6" style={{ background: "var(--ramune)" }} />
        use this voice
      </div>
      <h2 className="font-display text-[26px] font-bold leading-[1.1] tracking-[-0.02em] sm:text-[30px]">Hand it to an agent</h2>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-foreground">
        One copy carries the whole contract: the passages this voice is measured against, the words it refuses, and the
        numbers a checker enforces. Paste it to an agent ahead of whatever you want written, and it writes as {name}.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            if (!(await copyText(handoff))) return;
            trackCopy({ artifact: "voice-agent-handoff", languageId: id, languageName: name, label: "Copy for your agent" });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex h-11 items-center gap-2 bg-foreground px-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-transform hover:-translate-y-[2px] motion-reduce:transition-none"
        >
          {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          {copied ? "Copied — paste it to your agent" : "Copy for your agent"}
        </button>
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-expanded={shown}
          className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground"
        >
          {shown ? "Hide what gets copied" : "See what gets copied"}
        </button>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
          {handoff.length.toLocaleString()} characters · measured from {words.toLocaleString()} words
        </span>
      </div>
      {shown ? (
        <pre className="mt-5 max-h-[420px] overflow-auto whitespace-pre-wrap bg-[var(--paper-sticker)] p-4 font-mono text-[13px] leading-relaxed text-foreground shadow-[var(--shadow-sticker)]">
          {handoff}
        </pre>
      ) : null}
    </section>
  );
}

/**
 * A long passage folded to a height, opened by a control.
 *
 * The fold is CSS, so the whole text is always in the DOM: the corpus and the
 * exemplars are the evidence this page exists to show, and a reader's find, a
 * select-all copy and a screen reader must all reach every word of them whether
 * or not the fold happens to be open. Nothing here shortens the text.
 */
export function Folded({ children, openLabel, closedLabel, height = 340 }: { children: React.ReactNode; openLabel: string; closedLabel: string; height?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div style={open ? undefined : { maxHeight: height, overflow: "hidden", maskImage: "linear-gradient(to bottom, #000 72%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, #000 72%, transparent 100%)" }}>
        {children}
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground underline decoration-[var(--yuzu)] decoration-2 underline-offset-[3px] hover:text-foreground"
      >
        {open ? openLabel : closedLabel}
      </button>
    </>
  );
}
