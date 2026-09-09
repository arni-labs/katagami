import Link from "next/link";
import type { ReactNode } from "react";
import { Marker } from "@/components/page-hero";

// Compact page head for the lab pages: eyebrow, title with one highlighter
// swipe, a line of description, and the counts.

export function LabHeader({
  eyebrow,
  ink,
  title,
  marker,
  markerColor,
  description,
  variants,
  stats,
}: {
  eyebrow: string;
  ink: string;
  title: string;
  marker: string;
  markerColor: "sakura" | "yuzu" | "ramune" | "matcha";
  description: ReactNode;
  variants?: Array<{ href: string; label: string; active: boolean }>;
  stats: Array<{ value: number | string; label: string }>;
}) {
  return (
    <section className="relative pt-6 sm:pt-8">
      <span aria-hidden className="halftone-wash -right-8 -top-6 hidden h-44 w-64 sm:block" style={{ ["--wash-ink" as string]: ink }} />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="riso-reveal max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-block h-[3px] w-9" style={{ background: ink }} />
            {eyebrow}
          </div>
          <h1 className="font-display text-[32px] font-bold leading-[1.02] tracking-[-0.03em] sm:text-[40px] lg:text-[44px]">
            {title} <Marker color={markerColor}>{marker}</Marker>
          </h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="riso-reveal flex flex-wrap items-end gap-6 lg:flex-col lg:items-end" style={{ ["--reveal-i" as string]: 2 }}>
          <div className="flex items-end gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-right">
                <div className="font-display text-[32px] font-bold leading-none tracking-[-0.04em] tabular-nums sm:text-[38px]">{stat.value}</div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
          {variants?.length ? <nav aria-label="Variation" className="flex items-center gap-1.5">
            {variants.map((variant) => (
              <Link
                key={variant.href}
                href={variant.href}
                aria-current={variant.active ? "page" : undefined}
                className="inline-flex h-9 items-center px-3.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] shadow-[var(--shadow-sticker)] transition-transform hover:-translate-y-[1px] motion-reduce:hover:translate-y-0"
                style={variant.active ? { background: "var(--foreground)", color: "var(--background)" } : { background: "var(--paper-sticker)", color: "var(--muted-foreground)" }}
              >
                {variant.label}
              </Link>
            ))}
          </nav> : null}
        </div>
      </div>
      <span aria-hidden className="sticker-perforation mt-6 block" />
    </section>
  );
}
