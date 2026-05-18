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
      className="absolute right-2 top-2 z-30 flex items-center gap-1 rounded-[4px] border border-[color-mix(in_oklch,var(--sumire)_26%,var(--border))] bg-[color-mix(in_oklch,var(--paper-sticker)_92%,transparent)] p-1 shadow-[0_2px_9px_rgba(30,35,45,0.14)] backdrop-blur-[2px]"
      style={{ transform: "rotate(-1deg)" }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-1.5 h-[9px] w-11 rounded-[1px] opacity-85 shadow-[0_1px_1px_rgba(30,35,45,0.08)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--yuzu) 72%, var(--paper-tape-mix)) 0 5px, color-mix(in oklch, var(--yuzu) 38%, var(--paper-tape-mix)) 5px 10px)",
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
