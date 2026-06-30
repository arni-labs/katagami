"use client";

import { useState } from "react";
import { InlineRemix, type LanguageOpt, type PaletteOpt, type ArtOpt } from "@/components/remix/inline-remix";
import { SavedMixes, type SavedMix, type LoadSelection } from "@/components/remix/saved-mixes";

/**
 * Studio shell: owns the "load a saved mix" handoff. Clicking a saved mix seeds
 * the InlineRemix above (via a keyed remount with `initial`) and scrolls up so
 * you see it big. Otherwise the remix studio runs free.
 */
export function StudioClient({
  ui,
  palettes,
  art,
  saved,
}: {
  ui: LanguageOpt[];
  palettes: PaletteOpt[];
  art: ArtOpt[];
  saved: SavedMix[];
}) {
  const [initial, setInitial] = useState<LoadSelection | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  function load(sel: LoadSelection) {
    setInitial(sel);
    setNonce((n) => n + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <InlineRemix
        key={nonce}
        languages={ui}
        palettes={palettes}
        art={art}
        enableSave
        initial={initial}
      />
      <SavedMixes saved={saved} languages={ui} palettes={palettes} art={art} onLoad={load} />
    </div>
  );
}
