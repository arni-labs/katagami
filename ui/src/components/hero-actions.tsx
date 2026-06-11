"use client";

/** Hero CTA that scrolls to the wall and asks the filters to deal a
 *  random visible sheet (handled in GalleryFilters via window event). */
export function SurpriseChip() {
  return (
    <button
      type="button"
      onClick={() => {
        document
          .getElementById("gallery")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(
          () => window.dispatchEvent(new Event("katagami:shuffle")),
          350,
        );
      }}
      className="group relative inline-flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-foreground transition-all duration-200 hover:-translate-y-[2px] hover:rotate-[1deg]"
      style={{
        background:
          "color-mix(in srgb, var(--sakura) 20%, var(--paper-stamp-mix))",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <span aria-hidden>✦</span>
      surprise me
    </button>
  );
}
