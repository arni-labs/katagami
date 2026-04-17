"use client";

import { useState } from "react";
import { EmbodimentViewer } from "@/components/embodiment-viewer";
import { DynamicEmbodiment } from "@/components/dynamic-embodiment";

type View = "neo-kawaii" | "kukan-press";
type Source = "manual" | "agent";
type Mode = "side-by-side" | "radix-only" | "original-only";

const LANGUAGES: Record<View, { name: string; fileId: string | null }> = {
  "neo-kawaii": {
    name: "Neo-Kawaii Tech",
    fileId: null,
  },
  "kukan-press": {
    name: "Kukan Press Grid",
    fileId: null,
  },
};

function previewUrl(view: View, source: Source) {
  return `/radix-test/preview/${view}-${source}`;
}

export default function RadixTestPage() {
  const [view, setView] = useState<View>("neo-kawaii");
  const [source, setSource] = useState<Source>("agent");
  const [mode, setMode] = useState<Mode>("radix-only");
  const lang = LANGUAGES[view];

  return (
    <div className="min-h-screen bg-background">
      {/* Controls */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-[2000px] px-4 py-3 flex items-center gap-6 flex-wrap">
          <h1 className="text-sm font-semibold tracking-tight">
            Radix Embodiment Test
          </h1>

          {/* Language selector */}
          <div className="flex gap-1 rounded-md border p-0.5">
            {(["neo-kawaii", "kukan-press"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  view === v
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {LANGUAGES[v].name}
              </button>
            ))}
          </div>

          {/* Source selector */}
          <div className="flex gap-1 rounded-md border p-0.5">
            {(
              [
                ["agent", "Agent (gpt-5.4)"],
                ["manual", "Manual"],
              ] as const
            ).map(([s, label]) => (
              <button
                key={s}
                onClick={() => setSource(s as Source)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  source === s
                    ? "bg-green-600 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mode selector */}
          <div className="flex gap-1 rounded-md border p-0.5">
            {(
              [
                ["side-by-side", "Side by Side"],
                ["radix-only", "Radix Only"],
                ["original-only", "Original Only"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  mode === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            {source === "agent" ? "Agent-generated (OpenPaw + gpt-5.4)" : "Manually crafted"} Radix embodiments
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[2000px] p-4">
        {mode === "side-by-side" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Original HTML/CSS
                </span>
              </div>
              <div className="rounded-lg border overflow-hidden bg-white">
                {lang.fileId ? (
                  <EmbodimentViewer fileId={lang.fileId} />
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <p>Original embodiment requires Temper API.</p>
                    <p className="text-xs mt-1 font-mono">
                      Set fileId in LANGUAGES config when API is running.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  React + Radix ({source})
                </span>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <iframe
                  src={previewUrl(view, source)}
                  className="w-full border-0"
                  style={{ minHeight: 900 }}
                  title={`${lang.name} Radix embodiment`}
                />
              </div>
            </div>
          </div>
        )}

        {mode === "radix-only" && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                React + Radix &mdash; {lang.name} ({source})
              </span>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <iframe
                src={previewUrl(view, source)}
                className="w-full border-0"
                style={{ minHeight: 900 }}
                title={`${lang.name} Radix embodiment`}
              />
            </div>
          </div>
        )}

        {mode === "original-only" && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Original HTML/CSS &mdash; {lang.name}
              </span>
            </div>
            <div className="rounded-lg border overflow-hidden bg-white">
              {lang.fileId ? (
                <EmbodimentViewer fileId={lang.fileId} />
              ) : (
                <div className="p-16 text-center text-muted-foreground">
                  <p>Original embodiment requires Temper API.</p>
                  <p className="text-xs mt-2 font-mono">
                    Start the Temper server and update the fileId in
                    radix-test/page.tsx
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
