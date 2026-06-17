"use client";

import { ArchiveEntityButton } from "@/components/archive-entity-button";

/**
 * Owner-mode controls for a catalog lane card (palette, art style). Mirrors
 * LanguageCardOwnerControls — same risograph sticker chrome, same corner
 * placement, same click-swallow so the control never triggers the card's
 * link — but generic over the entity. Archive is only offered while the item
 * is still live; an already-archived item shows nothing to act on (matching
 * the one-way design-language flow).
 */
export function CatalogCardOwnerControls({
  entitySet,
  id,
  name,
  noun,
  status,
}: {
  entitySet: string;
  id: string;
  name: string;
  noun: string;
  status: string;
}) {
  if (status === "Archived") return null;

  return (
    <div
      className="absolute right-2 top-2 z-30 flex items-center gap-1 rounded-[2px] bg-[color-mix(in_oklch,var(--paper-sticker)_92%,transparent)] p-1 backdrop-blur-[2px]"
      style={{
        transform: "rotate(-1deg)",
        boxShadow: "var(--shadow-card)",
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-1.5 h-[9px] w-11 rounded-[1px]"
        style={{
          background: "var(--yuzu)",
          opacity: 0.75,
          mixBlendMode: "var(--ink-blend)" as never,
          transform: "rotate(-5deg)",
        }}
      />
      <ArchiveEntityButton
        entitySet={entitySet}
        id={id}
        name={name}
        noun={noun}
        variant="icon"
      />
    </div>
  );
}
