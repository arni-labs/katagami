"use client";

import { DeleteLanguageButton } from "@/components/delete-language-button";
import { FeaturedLanguageButton } from "@/components/featured-language-button";
import { SendToReviewLanguageButton } from "@/components/send-to-review-language-button";

export function LanguageCardOwnerControls({
  id,
  name,
  status,
  featured,
  displayOrder,
}: {
  id: string;
  name: string;
  status: string;
  featured: boolean;
  displayOrder: number;
}) {
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
      <FeaturedLanguageButton
        id={id}
        name={name}
        featured={featured}
        displayOrder={displayOrder}
      />
      {status === "Published" ? (
        <SendToReviewLanguageButton id={id} name={name} />
      ) : null}
      <DeleteLanguageButton
        id={id}
        name={name}
        variant="icon"
      />
    </div>
  );
}
