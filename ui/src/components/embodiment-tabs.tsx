"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { EmbodimentViewer } from "@/components/embodiment-viewer";

export type EmbodimentTab = {
  key: string;
  label: string;
  /** Served URL of the self-contained HTML (embodiment / landing / dashboard). */
  url: string;
};

/**
 * Segmented switcher over a language's three embodiments — the element
 * showcase, the bespoke Landing, and the bespoke Dashboard. Each renders in the
 * safety-sandboxed EmbodimentViewer. We remount the viewer per tab (key=url) so
 * the auto-height measurement re-runs for the newly selected document.
 *
 * One overlay on the preview opens `cur.url` — the landing / embodiment /
 * dashboard currently shown. The shared viewer stays chrome-free (compare /
 * AB / radix-test). The old dotted tab-row escape hatch does not come back.
 */
export function EmbodimentTabs({
  tabs,
}: {
  tabs: EmbodimentTab[];
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
      </div>

      <div className="relative min-w-0">
        <div className="overflow-hidden shadow-[var(--shadow-card)]">
          {/* key=url → remount on tab switch so height re-measures */}
          <EmbodimentViewer key={cur.url} src={cur.url} />
        </div>
        <a
          href={cur.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open full ${cur.label}`}
          className="group absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-none bg-card/90 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground shadow-[0_1px_3px_rgba(30,35,45,0.16)] backdrop-blur-[2px] transition-all hover:-translate-y-[1px] hover:text-foreground"
        >
          <span className="hidden sm:inline">open full</span>
          <span className="sm:hidden">full</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
