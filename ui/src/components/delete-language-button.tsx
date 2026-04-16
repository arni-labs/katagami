"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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

  function handleDelete() {
    startTransition(async () => {
      await deleteLanguage(id);
      setConfirming(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    });
  }

  if (confirming) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirming(false)}
        />
        {/* Dialog */}
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="w-full max-w-sm rounded-xl bg-popover p-6 shadow-lg ring-1 ring-foreground/10 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-base font-medium">
                Delete &ldquo;{name}&rdquo;?
              </h3>
              <p className="text-sm text-muted-foreground">
                This will permanently remove this design language and its spec.
                This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
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
      </>
    );
  }

  if (variant === "icon") {
    return (
      <button
        className="absolute top-2 right-2 z-10 hidden group-hover:flex items-center justify-center w-7 h-7 rounded-md bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
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
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Delete
    </Button>
  );
}
