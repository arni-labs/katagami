"use client";

import { useState, useTransition } from "react";
import { publishWritingStyle } from "@/app/(site)/voice/actions";

export function PublishVoiceButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              await publishWritingStyle(id);
            } catch (e) {
              setError(e instanceof Error ? e.message : "publish failed");
            }
          })
        }
        /* Radius 0: `ui/DESIGN.md` gives every rectangular surface on
           katagami.ai square corners, and this button now sits on the writing
           lane's page beside controls that already follow it. */
        className="inline-flex h-10 items-center bg-foreground px-5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-background shadow-[0_2px_0_rgba(30,35,45,0.16)] transition-transform hover:-translate-y-[2px] disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none"
      >
        {pending ? "Publishing…" : "Publish this voice"}
      </button>
      {error ? (
        <span className="font-mono text-[10px] text-muted-foreground">{error}</span>
      ) : null}
    </span>
  );
}
