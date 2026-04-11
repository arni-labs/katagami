"use client";

import { getFileUrl } from "@/lib/odata";

export function EmbodimentViewer({ fileId }: { fileId: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-white">
      <iframe
        src={getFileUrl(fileId)}
        className="w-full h-[600px]"
        sandbox="allow-scripts"
        title="Design language embodiment"
      />
    </div>
  );
}
