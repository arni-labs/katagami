"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addCuratorNotes } from "@/app/actions";

export function CuratorNotesEditor({
  id,
  existingNotes,
}: {
  id: string;
  existingNotes?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(existingNotes ?? "");

  function handleSave() {
    startTransition(async () => {
      await addCuratorNotes(id, notes);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {existingNotes && (
        <div className="rounded-md bg-muted p-4 text-sm">
          <p className="font-medium mb-1">Curator Notes</p>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {existingNotes}
          </p>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setNotes(existingNotes ?? "");
          setOpen(true);
        }}
      >
        {existingNotes ? (
          <>
            <Pencil className="h-4 w-4 mr-1" />
            Edit Feedback
          </>
        ) : (
          <>
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            Add Feedback
          </>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="w-full max-w-md rounded-xl bg-popover p-6 shadow-lg ring-1 ring-foreground/10 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1.5">
                <h3 className="text-base font-medium">
                  {existingNotes ? "Edit Feedback" : "Add Feedback"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Notes about what to improve, what works well, or issues with
                  this design language.
                </p>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. The color palette feels too muted for a maximalist language..."
                rows={6}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending || !notes.trim()}
                >
                  {isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
