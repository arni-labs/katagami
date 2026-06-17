"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveCatalogItem } from "@/app/actions";

/**
 * Generic owner archive control for a catalog lane entity (palette, art
 * style — design languages keep their own DeleteLanguageButton). It mirrors
 * that button's risograph dialog exactly, parameterized by the OData entity
 * set and a human noun, so every lane archives "the same way". The server
 * action re-checks owner mode before it changes anything.
 */
export interface ArchiveEntityTarget {
  id: string;
  name: string;
}

export function ArchiveEntityButton({
  entitySet,
  id,
  name,
  noun,
  redirectTo,
  variant = "button",
}: {
  entitySet: string;
  id: string;
  name: string;
  noun: string;
  redirectTo?: string;
  variant?: "button" | "icon";
}) {
  const [confirming, setConfirming] = useState(false);

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          className="group/archive relative flex h-7 w-7 items-center justify-center rounded-[3px] bg-[color-mix(in_srgb,var(--beni)_14%,var(--paper-stamp-mix))] text-[color-mix(in_oklch,var(--beni)_72%,var(--foreground))] shadow-[0_1px_0_rgba(30,35,45,0.08)] transition-all hover:-translate-y-0.5 hover:rotate-[2deg] hover:bg-[var(--beni)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 disabled:pointer-events-none disabled:opacity-60"
          aria-label={`Archive ${name}`}
          title={`Archive ${name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(true);
          }}
        >
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--sakura)] opacity-0 transition-opacity group-hover/archive:opacity-100"
          />
          <Archive className="h-3.5 w-3.5" />
        </button>
        <ArchiveEntityDialog
          key={confirming ? id : "closed"}
          entitySet={entitySet}
          target={{ id, name }}
          noun={noun}
          open={confirming}
          onOpenChange={setConfirming}
          redirectTo={redirectTo}
        />
      </>
    );
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
        <Archive className="h-4 w-4 mr-1" />
        Archive
      </Button>
      <ArchiveEntityDialog
        key={confirming ? id : "closed"}
        entitySet={entitySet}
        target={{ id, name }}
        noun={noun}
        open={confirming}
        onOpenChange={setConfirming}
        redirectTo={redirectTo}
      />
    </>
  );
}

export function ArchiveEntityDialog({
  entitySet,
  target,
  noun,
  open,
  onOpenChange,
  redirectTo,
}: {
  entitySet: string;
  target: ArchiveEntityTarget | null;
  noun: string;
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

  function handleArchive() {
    if (!target) return;
    setError(null);
    startTransition(async () => {
      try {
        await archiveCatalogItem(entitySet, target.id);
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
          aria-labelledby={`archive-${target.id}-title`}
          aria-describedby={`archive-${target.id}-description`}
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
                  id={`archive-${target.id}-title`}
                  className="font-display text-[23px] font-bold leading-tight tracking-[-0.02em]"
                >
                  Archive &ldquo;{target.name}&rdquo;?
                </h3>
              </div>
            </div>

            <p
              id={`archive-${target.id}-description`}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              This hides the {noun} from the public catalog without deleting its
              record. The server checks owner mode again before it changes
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
                onClick={handleArchive}
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
