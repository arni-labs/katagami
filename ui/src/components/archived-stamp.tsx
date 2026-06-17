/**
 * Corner marker shown on a catalog card that has been archived. Archived
 * items are only fetched for owners, so this is an owner-facing cue that the
 * item is hidden from the public catalog — a quiet beni stamp, no border.
 */
export function ArchivedStamp() {
  return (
    <span
      className="pointer-events-none absolute left-2 top-2 z-20 rounded-[2px] bg-[color-mix(in_srgb,var(--beni)_16%,var(--paper-sticker))] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[color-mix(in_oklch,var(--beni)_72%,var(--foreground))] shadow-[0_1px_0_rgba(30,35,45,0.08)]"
      style={{ transform: "rotate(-2deg)" }}
    >
      archived
    </span>
  );
}
