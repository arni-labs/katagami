"use client";

import { Suspense, use, type ReactNode } from "react";
import { DeleteLanguageButton } from "@/components/delete-language-button";
import { FeaturedLanguageButton } from "@/components/featured-language-button";
import { SendToReviewLanguageButton } from "@/components/send-to-review-language-button";

type OwnerControlsProps = {
  id: string;
  name: string;
  status: string;
  featured: boolean;
  displayOrder: number;
};

function ResolvedOwnerControls({
  canDelete,
  ...props
}: OwnerControlsProps & { canDelete: Promise<boolean> }): ReactNode {
  return use(canDelete) ? <LanguageCardOwnerControls {...props} /> : null;
}

/** Renders the owner controls when `canDelete` is — or resolves to — true.
 *  Accepts a Promise so the gallery can paint the public, cached cards
 *  immediately and stream the owner-only controls in once the SERVER-SIDE
 *  isOwner() check resolves: the client never decides authorization, it only
 *  awaits the server's answer (the fallback shows no controls). A plain boolean
 *  (server-rendered contexts) renders synchronously with no Suspense. */
export function LanguageCardOwnerSlot({
  canDelete,
  ...props
}: OwnerControlsProps & { canDelete: boolean | Promise<boolean> }): ReactNode {
  if (typeof canDelete === "boolean") {
    return canDelete ? <LanguageCardOwnerControls {...props} /> : null;
  }
  return (
    <Suspense fallback={null}>
      <ResolvedOwnerControls canDelete={canDelete} {...props} />
    </Suspense>
  );
}

export function LanguageCardOwnerControls({
  id,
  name,
  status,
  featured,
  displayOrder,
}: OwnerControlsProps) {
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
