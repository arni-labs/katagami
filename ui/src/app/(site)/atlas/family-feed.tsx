"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { AtlasHole, AtlasStyle } from "@/lib/catalog";
import { AtlasMap, type AtlasApi } from "./atlas-map";
import { FitPicture } from "./fit-picture";

// The atlas for a thumb. A free-panning map of small tiles is a desktop
// pleasure and a phone chore, so on a phone the same families are rows you
// swipe: down through the families, sideways through each one. Native
// scrolling does the work, so it is fast and cannot be lost in.

type Family = { id: string; label: string; lead: string; count: number; x: number; y: number };
const INKS = ["var(--sakura)", "var(--ramune)", "var(--yuzu)"];
const ROW_H = 92;

export function FamilyFeed({ styles, families, holes, lit, accent, find, onSoon }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[]; lit?: Set<string> | null; accent?: Set<string> | null; find?: string; onSoon?: (id: string) => void }) {
  const rows = useMemo(() => {
    const q = (find ?? "").trim().toLowerCase();
    const keep = (s: AtlasStyle) => (!lit || lit.has(s.id)) && (!q || s.name.toLowerCase().includes(q));
    // Families that sit near each other on the map never share an ink.
    const ink = new Map<string, number>();
    for (const f of families) {
      const near = families.filter((o) => ink.has(o.id)).sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y)).slice(0, 2).map((o) => ink.get(o.id));
      ink.set(f.id, [0, 1, 2].find((i) => !near.includes(i)) ?? 0);
    }
    const out = families.map((f) => {
      const members = styles.filter((s) => s.family === f.id && keep(s)).sort((a, b) => Number(b.id === f.lead) - Number(a.id === f.lead) || Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y));
      // What is still to come in this family's part of the map: the directions seated nearest its centre.
      const soon = lit || q ? [] : holes.filter((h) => Math.hypot(h.x - f.x, h.y - f.y) < 0.07).slice(0, 4);
      return { id: f.id, label: f.label, ink: INKS[ink.get(f.id) ?? 0], total: f.count, members, soon };
    }).filter((r) => r.members.length > 0) as { id: string; label: string; ink: string; total: number; members: AtlasStyle[]; soon: AtlasHole[] }[];
    const alone = styles.filter((s) => (!s.family || !families.some((f) => f.id === s.family)) && keep(s));
    // A name search also reaches the directions still to come, wherever they sit.
    const named = q ? holes.filter((h) => h.name.toLowerCase().includes(q)).slice(0, 12) : [];
    if (named.length > 0) out.push({ id: "soon", label: "Coming soon", ink: "var(--sakura)", total: named.length, members: [], soon: named });
    if (alone.length > 0) out.push({ id: "alone", label: "On their own", ink: "var(--muted-foreground)", total: alone.length, members: alone, soon: [] });
    return out;
  }, [styles, families, holes, lit, find]);

  if (rows.length === 0) return <p className="px-4 py-10 text-[14px] text-muted-foreground">Nothing in view matches that.</p>;
  return (
    <div className="flex flex-col gap-6 pb-10">
      {rows.map((row) => (
        <section key={row.id} aria-label={row.label}>
          <h2 className="flex items-center gap-2 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: row.ink }} />
            {row.label}
            <span className="font-normal text-muted-foreground">{row.members.length === row.total || row.members.length === 0 ? row.total : `${row.members.length} of ${row.total}`}</span>
          </h2>
          <ul className="mt-2 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {row.members.map((s) => (
              <li key={s.id} className="shrink-0 snap-start">
                <Link href={s.href} className="block">
                  <span className="relative block w-fit">
                    <FitPicture src={s.thumbnail_url} height={ROW_H} maxWidth={Math.round(ROW_H * 1.9)} />
                    {lit ? <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: accent?.has(s.id) ? "var(--sakura)" : "var(--ramune)" }} /> : null}
                  </span>
                  <span className="mt-1 block max-w-[9.5rem] truncate text-[12.5px] font-semibold leading-tight">{s.name}</span>
                </Link>
              </li>
            ))}
            {row.soon.map((h) => (
              <li key={h.id} className="shrink-0 snap-start">
                <button type="button" onClick={() => onSoon?.(h.id)} className="block cursor-pointer text-left">
                <span className="relative block overflow-hidden" style={{ height: ROW_H, width: Math.round(ROW_H * 1.2) }}>
                  <span aria-hidden className="halftone-wash absolute inset-0" style={{ ["--wash-ink" as string]: "var(--sakura)", opacity: 0.5 }} />
                  <span className="absolute bottom-1.5 left-1.5 bg-[var(--sakura)] px-1 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-white">soon</span>
                </span>
                <span className="mt-1 block max-w-[7rem] truncate text-[12.5px] leading-tight text-muted-foreground">{h.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The atlas on a phone: the family rows by default, the map one tap away. A host page puts its own controls in `top`, and an answer of its own in place of the rows as `body`. */
export function PhoneAtlas({ styles, families, holes, sample, lit, accent, top, body, apiRef }: { styles: AtlasStyle[]; families: Family[]; holes: AtlasHole[]; sample: boolean; lit?: Set<string> | null; accent?: Set<string> | null; top?: React.ReactNode; body?: ((showOnMap: (id: string) => void) => React.ReactNode) | null; apiRef?: React.MutableRefObject<AtlasApi | null> }) {
  const [view, setView] = useState<"list" | "map">("list");
  const [find, setFind] = useState("");
  // A direction still to come has no page of its own: a tap takes it to the map, where its sheet says what it is.
  const own = useRef<AtlasApi | null>(null);
  const api = apiRef ?? own;
  const [wanted, setWanted] = useState<string | null>(null);
  const showOnMap = (id: string) => { setWanted(id); setView("map"); };
  useEffect(() => {
    if (view !== "map" || !wanted) return;
    api.current?.focusOn(wanted);
  }, [view, wanted, api]);
  const tab = (value: "list" | "map", label: string) => (
    <button type="button" aria-pressed={view === value} onClick={() => { setWanted(null); setView(value); }} className={`cursor-pointer px-3 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${view === value ? "bg-foreground text-background" : "text-muted-foreground"}`}>{label}</button>
  );
  return (
    <div className="flex h-[calc(100dvh-65px-4rem-env(safe-area-inset-bottom))] w-full flex-col overflow-hidden">
      <div className="z-10 max-h-[60%] shrink-0 overflow-y-auto bg-background px-4 pb-2 pt-3 shadow-[0_1px_0_rgba(30,35,45,0.06)]">
        <h1 className="sr-only">The atlas</h1>
        {top}
        <div className="mt-2 flex items-center gap-2">
          {/* An answer is a short ranked list: there is nothing in it to find by name. */}
          {body ? <span className="flex-1" /> : (
          <div className="relative min-w-0 flex-1">
              <label htmlFor="atlas-filter" className="sr-only">Find a style by name</label>
              <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input id="atlas-filter" type="search" value={find} onChange={(e) => { setFind(e.target.value); setView("list"); }} placeholder="Find by name" autoComplete="off" className="w-full bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] py-2 pl-8 pr-2 text-[16px] outline-none placeholder:text-muted-foreground" />
            </div>
          )}
          <div role="group" aria-label="View" className="flex shrink-0 bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)]">{tab("list", "List")}{tab("map", "Map")}</div>
        </div>
      </div>
      {view === "map" ? (
        <div className="relative min-h-0 flex-1">
          <AtlasMap styles={styles} families={families} holes={holes} unplaced={0} sample={sample} host={{ ownChrome: false, fill: true, lit, accent, apiRef: api, insets: { top: 12, right: 12, bottom: 12, left: 12 } }} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pt-4" style={{ overscrollBehavior: "contain" }}>
          {body ? <div className="px-4 pb-8">{body(showOnMap)}</div> : <FamilyFeed styles={styles} families={families} holes={holes} lit={lit} accent={accent} find={find} onSoon={showOnMap} />}
          {sample ? <p className="px-4 pb-8 text-[13px] text-muted-foreground">This is the visitor shelf. <Link href="/signin" className="ink-underline text-foreground">Sign in for all</Link></p> : null}
        </div>
      )}
    </div>
  );
}
