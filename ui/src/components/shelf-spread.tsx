"use client";

import { useRef, useState } from "react";

/** Pulls a drawer shelf all the way open (rail → grid) and slides it back. */
export function ShelfSpread() {
  const ref = useRef<HTMLButtonElement>(null);
  const [spread, setSpread] = useState(false);

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={spread}
      onClick={() => {
        const section = ref.current?.closest("[data-shelf-section]");
        if (!section) return;
        const next = !spread;
        section.setAttribute("data-spread", String(next));
        setSpread(next);
      }}
      className="shrink-0 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-foreground/80 transition-all hover:-translate-y-[1px] hover:text-foreground"
      style={{
        background:
          "color-mix(in srgb, var(--ramune) 11%, var(--paper-stamp-mix))",
      }}
    >
      {spread ? "← slide in" : "spread out →"}
    </button>
  );
}
