"use client";

import { useEffect, useState } from "react";
import { getFileUrl } from "@/lib/odata";

export function EmbodimentViewer({ fileId }: { fileId: string }) {
  const [status, setStatus] = useState<"loading" | "ok" | "failed">("loading");
  const url = getFileUrl(fileId);

  useEffect(() => {
    // Pre-check if the file exists before showing iframe
    fetch(url, { method: "HEAD" }).then((res) => {
      setStatus(res.ok ? "ok" : "failed");
    }).catch(() => setStatus("failed"));
  }, [url]);

  if (status === "loading") {
    return (
      <div className="h-[600px] rounded-lg border bg-muted animate-pulse" />
    );
  }

  if (status === "failed") {
    return (
      <div className="text-center py-16 text-muted-foreground rounded-lg border border-dashed">
        <p className="text-sm">Embodiment file not available yet.</p>
        <p className="text-xs mt-1 font-mono">{fileId}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-white">
      <iframe
        src={url}
        className="w-full"
        style={{ minHeight: 800 }}
        sandbox="allow-scripts"
        title="Design language embodiment"
      />
    </div>
  );
}
