"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLanguage } from "@/app/actions";

export function DeleteLanguageButton({
  id,
  name,
  redirectTo,
  variant = "button",
}: {
  id: string;
  name: string;
  redirectTo?: string;
  variant?: "button" | "icon";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteLanguage(id);
        setConfirming(false);
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  if (confirming) {
    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-[rgba(36,24,28,0.48)] backdrop-blur-[3px]"
          onClick={() => setConfirming(false)}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-language-${id}-title`}
            aria-describedby={`delete-language-${id}-description`}
            className="relative w-full max-w-md rotate-[-0.4deg] overflow-hidden rounded-[3px] border border-border bg-[var(--paper-sticker)] p-5 text-foreground shadow-[0_18px_48px_rgba(30,35,45,0.22)] ring-1 ring-foreground/10 backdrop-blur-sm dark:bg-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -left-4 top-3 h-[18px] w-24 rotate-[-7deg] rounded-[1px] opacity-90 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
              style={{
                background:
                  "repeating-linear-gradient(45deg, color-mix(in oklch, var(--sakura) 76%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, var(--sakura) 38%, var(--paper-tape-mix)) 7px 14px)",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -right-3 top-4 h-[16px] w-16 rotate-[8deg] rounded-[1px] opacity-85 shadow-[0_1px_2px_rgba(30,35,45,0.08)]"
              style={{
                background:
                  "repeating-linear-gradient(45deg, color-mix(in oklch, var(--yuzu) 78%, var(--paper-tape-mix)) 0 7px, color-mix(in oklch, var(--yuzu) 36%, var(--paper-tape-mix)) 7px 14px)",
              }}
            />

            <div className="relative space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-destructive/25 bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="stamp inline-flex text-[var(--beni)]">
                    permanent
                  </div>
                  <h3
                    id={`delete-language-${id}-title`}
                    className="font-display text-[22px] font-bold leading-tight tracking-[-0.02em]"
                  >
                    Delete &ldquo;{name}&rdquo;?
                  </h3>
                </div>
              </div>

              <p
                id={`delete-language-${id}-description`}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                This will permanently remove this design language and its spec.
                This cannot be undone.
              </p>

              {error ? (
                <p className="rounded-[4px] border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              ) : null}

              <div className="sticker-perforation" />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirming(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        className="absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-[3px] border border-destructive/30 bg-background/90 text-destructive shadow-[0_2px_8px_rgba(30,35,45,0.12)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:rotate-[1deg] hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setConfirming(true);
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => {
        setError(null);
        setConfirming(true);
      }}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Delete
    </Button>
  );
}
