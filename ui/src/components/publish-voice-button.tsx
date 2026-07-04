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
        className="rounded-[9999px] bg-foreground px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish this voice"}
      </button>
      {error ? (
        <span className="font-mono text-[10px] text-muted-foreground">{error}</span>
      ) : null}
    </span>
  );
}
