"use client";

import { useState } from "react";
import { EmbodimentViewer } from "@/components/embodiment-viewer";

export type EmbodimentTab = {
  key: string;
  label: string;
  /** Served URL of the self-contained HTML (embodiment / landing / dashboard). */
  url: string;
  /** Short note shown under the frame, e.g. "the full element showcase". */
  note?: string;
};

/**
 * Segmented switcher over a language's three embodiments — the element
 * showcase, the bespoke Landing, and the bespoke Dashboard. Each renders in the
 * safety-sandboxed EmbodimentViewer. We remount the viewer per tab (key=url) so
 * the auto-height measurement re-runs for the newly selected document.
 */
export function EmbodimentTabs({
  tabs,
  slug,
}: {
  tabs: EmbodimentTab[];
  slug?: string;
}) {
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;
  const cur = tabs[Math.min(active, tabs.length - 1)] ?? tabs[0];

  return (
    <div className="space-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="inline-flex max-w-full flex-wrap bg-card/70 p-0.5 shadow-[0_1px_2px_rgba(30,35,45,0.05),0_2px_8px_rgba(30,35,45,0.05)]">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActive(i)}
              data-active={i === active}
              className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:shadow-[0_1px_0_rgba(30,35,45,0.18)] sm:px-3.5 sm:tracking-[0.14em]"
            >
              {t.label}
            </button>
          ))}
        </div>
        {cur.note ? (
          <span className="min-w-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 [overflow-wrap:anywhere]">
            {cur.note}
          </span>
        ) : null}
      </div>

      <div className="relative min-w-0">
        <div className="sticker-card relative p-2 pb-9 sm:p-3 sm:pb-10">
          {/* key=url → remount on tab switch so height re-measures */}
          <EmbodimentViewer key={cur.url} src={cur.url} />
          <span className="absolute bottom-3 left-2 right-2 truncate text-center font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/80 sm:text-[10px] sm:tracking-[0.22em]">
            {cur.label.toLowerCase()} · {slug || "preview"}
          </span>
        </div>
      </div>
    </div>
  );
}
