"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLanguage } from "@/app/actions";

export interface DeleteLanguageTarget {
  id: string;
  name: string;
}

export function DeleteLanguageButton({
  id,
  name,
  redirectTo,
  variant = "button",
  onRequestDelete,
}: {
  id: string;
  name: string;
  redirectTo?: string;
  variant?: "button" | "icon";
  onRequestDelete?: (target: DeleteLanguageTarget) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  function requestDelete() {
    if (onRequestDelete) {
      onRequestDelete({ id, name });
      return;
    }
    setConfirming(true);
  }

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          className="group/delete relative flex h-7 w-7 items-center justify-center rounded-[3px] bg-[color-mix(in_srgb,var(--beni)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--beni)_72%,var(--foreground))] shadow-[0_1px_0_rgba(30,35,45,0.08)] transition-all hover:-translate-y-0.5 hover:rotate-[2deg] hover:bg-[var(--beni)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:pointer-events-none disabled:opacity-60"
          aria-label={`Archive ${name}`}
          title={`Archive ${name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            requestDelete();
          }}
        >
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--sakura)] opacity-0 transition-opacity group-hover/delete:opacity-100"
          />
          <Archive className="h-3.5 w-3.5" />
        </button>
        {onRequestDelete ? null : (
          <DeleteLanguageDialog
            key={confirming ? id : "closed"}
            target={{ id, name }}
            open={confirming}
            onOpenChange={setConfirming}
            redirectTo={redirectTo}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={requestDelete}>
        <Archive className="h-4 w-4 mr-1" />
        Archive
      </Button>
      <DeleteLanguageDialog
        key={confirming ? id : "closed"}
        target={{ id, name }}
        open={confirming}
        onOpenChange={setConfirming}
        redirectTo={redirectTo}
      />
    </>
  );
}

export function DeleteLanguageDialog({
  target,
  open,
  onOpenChange,
  redirectTo,
}: {
  target: DeleteLanguageTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onOpenChange(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending, onOpenChange, open]);

  if (!open || !target || typeof document === "undefined") return null;

  function handleDelete() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteLanguage(target.id);
        onOpenChange(false);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not archive.");
      }
    });
  }

  const dialog = (
    <>
      <div
        className="fixed inset-0 z-[80] bg-[rgba(36,24,28,0.42)] backdrop-blur-[4px]"
        onClick={() => {
          if (!isPending) onOpenChange(false);
        }}
      />
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-4">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`delete-language-${target.id}-title`}
          aria-describedby={`delete-language-${target.id}-description`}
          className="relative w-full max-w-[420px] overflow-hidden bg-[var(--paper-sticker)] p-5 text-foreground dark:bg-popover"
          style={{
            boxShadow: "var(--shadow-card)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -left-5 top-3 h-[18px] w-28 rounded-[1px]"
            style={{
              background: "var(--sakura)",
              opacity: 0.75,
              mixBlendMode: "var(--ink-blend)" as never,
              transform: "rotate(-8deg)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -right-3 top-5 h-[16px] w-20 rounded-[1px]"
            style={{
              background: "var(--yuzu)",
              opacity: 0.75,
              mixBlendMode: "var(--ink-blend)" as never,
              transform: "rotate(8deg)",
            }}
          />
          <button
            type="button"
            aria-label="Cancel archive"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-[3px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative space-y-4 pt-5">
            <div className="flex items-start gap-3">
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px] bg-[color-mix(in_srgb,var(--beni)_14%,var(--paper-stamp-mix))] text-destructive shadow-[0_1px_0_rgba(30,35,45,0.08)]">
                <Archive className="h-5 w-5 rotate-[-8deg]" />
              </span>
              <div className="min-w-0 space-y-1">
                <div className="stamp inline-flex text-[var(--beni)]">
                  catalog archive
                </div>
                <h3
                  id={`delete-language-${target.id}-title`}
                  className="font-display text-[23px] font-bold leading-tight tracking-[-0.02em]"
                >
                  Archive &ldquo;{target.name}&rdquo;?
                </h3>
              </div>
            </div>

            <p
              id={`delete-language-${target.id}-description`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              This hides the language from the public catalog without deleting
              its record. The server checks owner mode again before it changes
              anything.
            </p>

            {error ? (
              <div
                className="relative bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                style={{
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <AlertTriangle className="mr-2 inline h-4 w-4 align-[-3px]" />
                {error}
              </div>
            ) : null}

            <div className="sticker-perforation" />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="h-8 rounded-[3px] bg-[color-mix(in_srgb,var(--foreground)_8%,var(--paper-stamp-mix))] px-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                keep it
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="h-8 rounded-[3px] bg-[color-mix(in_srgb,var(--beni)_14%,var(--paper-stamp-mix))] px-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[color-mix(in_oklch,var(--beni)_72%,var(--foreground))] shadow-[0_2px_0_rgba(30,35,45,0.08)] transition-all hover:-translate-y-0.5 hover:rotate-[0.6deg] hover:bg-[var(--beni)] hover:text-white disabled:pointer-events-none disabled:opacity-60"
              >
                {isPending ? "archiving..." : "archive"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(dialog, document.body);
}
