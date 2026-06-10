"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Shuffle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fieldBase =
  "rounded-none border-0 border-b-2 border-foreground/15 bg-transparent px-1 font-mono text-sm text-foreground shadow-none transition-colors focus-visible:border-[var(--ramune)] focus-visible:ring-0 focus-visible:ring-offset-0";

/** Hue buckets for the ink explorer — order matters for display. */
export const HUE_BUCKETS = [
  { key: "red", ink: "var(--beni)" },
  { key: "orange", ink: "#e07b39" },
  { key: "yellow", ink: "var(--yuzu)" },
  { key: "green", ink: "var(--salad)" },
  { key: "teal", ink: "var(--teal)" },
  { key: "blue", ink: "var(--ramune)" },
  { key: "violet", ink: "var(--sumire)" },
  { key: "pink", ink: "var(--sakura)" },
  { key: "neutral", ink: "var(--graphite)" },
] as const;

export interface GalleryFilterState {
  status: string;
  taxonomy: string;
  search: string;
  tag: string;
  hue: string;
  source: string;
}

export function GalleryFilters({
  taxonomies,
  tags = [],
  hasSpecimens = false,
  totalCount = 0,
  initialStatus = "Published",
  initialTaxonomy = "all",
  initialSearch = "",
  initialTag = "all",
  initialHue = "all",
  initialSource = "all",
}: {
  taxonomies: { entity_id: string; fields: { name?: string } }[];
  /** Most common tags across the catalog, for vibe browsing. */
  tags?: Array<{ tag: string; count: number }>;
  hasSpecimens?: boolean;
  totalCount?: number;
  initialStatus?: string;
  initialTaxonomy?: string;
  initialSearch?: string;
  initialTag?: string;
  initialHue?: string;
  initialSource?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [taxonomy, setTaxonomy] = useState(initialTaxonomy);
  const [search, setSearch] = useState(initialSearch);
  const [tag, setTag] = useState(initialTag);
  const [hue, setHue] = useState(initialHue);
  const [source, setSource] = useState(initialSource);
  // The live count is written straight to the DOM alongside the card
  // visibility pass — same external sync, no extra render.
  const countRef = useRef<HTMLSpanElement>(null);

  const applyFilters = useCallback(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-gallery-card]"),
    );
    let count = 0;
    const drawerCounts = new Map<string, number>();

    for (const card of cards) {
      const cardStatus = card.dataset.status ?? "";
      const cardTaxonomies = (card.dataset.taxonomyIds ?? "")
        .split("\t")
        .filter(Boolean);
      const cardSearch = card.dataset.searchText ?? "";
      const cardTags = (card.dataset.tags ?? "").split("\t").filter(Boolean);
      const cardHue = card.dataset.hue ?? "";
      const isSpecimen = card.dataset.specimen === "true";
      const matchesStatus = status === "all" || cardStatus === status;
      const matchesTaxonomy =
        taxonomy === "all" || cardTaxonomies.includes(taxonomy);
      const matchesSearch =
        !normalizedSearch || cardSearch.includes(normalizedSearch);
      const matchesTag = tag === "all" || cardTags.includes(tag);
      const matchesHue = hue === "all" || cardHue === hue;
      const matchesSource =
        source === "all" ||
        (source === "library" ? !isSpecimen : isSpecimen);
      const visible =
        matchesStatus &&
        matchesTaxonomy &&
        matchesSearch &&
        matchesTag &&
        matchesHue &&
        matchesSource;
      card.hidden = !visible;
      if (visible) {
        count += 1;
        const drawer = card.dataset.drawer;
        if (drawer) drawerCounts.set(drawer, (drawerCounts.get(drawer) ?? 0) + 1);
      }
    }

    // A drawer label with nothing visible underneath disappears with it.
    for (const header of document.querySelectorAll<HTMLElement>(
      "[data-drawer-header]",
    )) {
      const drawer = header.dataset.drawerHeader ?? "";
      header.hidden = (drawerCounts.get(drawer) ?? 0) === 0;
    }

    const empty = document.querySelector<HTMLElement>("[data-gallery-empty]");
    if (empty) empty.hidden = count > 0;
    if (countRef.current) countRef.current.textContent = String(count);
  }, [status, taxonomy, search, tag, hue, source]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // Deal a random visible sheet: scroll to it and let the registration
  // slip for a beat. Also answers the hero's "surprise me" event.
  const shuffle = useCallback(() => {
    const visible = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-gallery-card]:not([hidden])",
      ),
    );
    if (visible.length === 0) return;
    const pick = visible[Math.floor(Math.random() * visible.length)];
    pick.scrollIntoView({ behavior: "smooth", block: "center" });
    for (const card of visible) delete card.dataset.dealt;
    pick.dataset.dealt = "true";
    window.setTimeout(() => {
      delete pick.dataset.dealt;
    }, 2400);
  }, []);

  useEffect(() => {
    const onShuffle = () => shuffle();
    window.addEventListener("katagami:shuffle", onShuffle);
    return () => window.removeEventListener("katagami:shuffle", onShuffle);
  }, [shuffle]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const setOrDelete = (key: string, value: string, defaultValue: string) => {
        if (value && value !== defaultValue) params.set(key, value);
        else params.delete(key);
      };
      setOrDelete("status", status, "Published");
      setOrDelete("taxonomy", taxonomy, "all");
      setOrDelete("tag", tag, "all");
      setOrDelete("hue", hue, "all");
      setOrDelete("src", source, "all");
      if (search.trim()) params.set("q", search.trim());
      else params.delete("q");
      const query = params.toString();
      const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", next);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [status, taxonomy, search, tag, hue, source]);

  return (
    <div className="relative flex min-w-0 max-w-full flex-col gap-3 bg-card/70 px-5 py-4 shadow-[0_1px_2px_rgba(33,33,60,0.03),4px_5px_0_color-mix(in_srgb,var(--ramune)_13%,transparent)]">
      {/* spot-ink corner strips */}
      <span
        aria-hidden
        className="washi-tape -left-3 -top-2"
        style={{ ["--strip-ink" as string]: "var(--yuzu)", transform: "rotate(-6deg) skewX(-8deg)" }}
      />
      <span
        aria-hidden
        className="washi-tape -bottom-2 -right-3 w-12"
        style={{ ["--strip-ink" as string]: "var(--sakura)", transform: "rotate(4deg) skewX(-8deg)" }}
      />

      {/* Row 1 — search, live count, shuffle */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3">
        <span className="ink-stamp" style={{ ["--ink" as string]: "var(--sumi)" }}>
          find
        </span>

        <div className="relative min-w-[150px] max-w-[320px] flex-1">
          <Search className="pointer-events-none absolute left-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="name, tag, vibe…"
            className={`${fieldBase} h-8 w-full pl-6 placeholder:text-muted-foreground/70`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <span
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
          aria-live="polite"
        >
          <span ref={countRef}>{totalCount}</span> / {totalCount} languages
        </span>

        <button
          type="button"
          onClick={shuffle}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-foreground transition-all hover:-translate-y-[1px] hover:rotate-[-1.5deg]"
          style={{
            background:
              "color-mix(in srgb, var(--sakura) 18%, var(--paper-stamp-mix))",
          }}
          title="Deal a random sheet"
        >
          <Shuffle className="h-3 w-3" />
          surprise me
        </button>
      </div>

      {/* Row 2 — ink explorer + vibe chips */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2.5">
        <FieldLabel>ink</FieldLabel>
        <div className="flex items-center gap-1.5" role="group" aria-label="Filter by dominant ink">
          <button
            type="button"
            onClick={() => setHue("all")}
            aria-pressed={hue === "all"}
            title="Any ink"
            className="px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-all"
            style={
              hue === "all"
                ? { background: "var(--sumi)", color: "var(--washi)" }
                : { color: "var(--graphite)" }
            }
          >
            any
          </button>
          {HUE_BUCKETS.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              onClick={() => setHue(hue === bucket.key ? "all" : bucket.key)}
              aria-pressed={hue === bucket.key}
              title={`${bucket.key} inks`}
              className="grid h-5 w-5 place-items-center transition-transform hover:scale-110"
            >
              <span
                aria-hidden
                className="h-3.5 w-3.5 rounded-full transition-all"
                style={{
                  background: bucket.ink,
                  boxShadow:
                    hue === bucket.key
                      ? "2px 2px 0 color-mix(in srgb, var(--sumi) 55%, transparent)"
                      : "none",
                  transform: hue === bucket.key ? "scale(1.25)" : undefined,
                }}
              />
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <>
            <FieldLabel>vibe</FieldLabel>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
              {tags.map(({ tag: t }) => {
                const active = tag === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTag(active ? "all" : t)}
                    aria-pressed={active}
                    className="shrink-0 px-2 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em] transition-all hover:-translate-y-[1px]"
                    style={
                      active
                        ? { background: "var(--sumi)", color: "var(--washi)" }
                        : {
                            background:
                              "color-mix(in srgb, var(--ramune) 11%, var(--paper-stamp-mix))",
                            color: "var(--foreground)",
                          }
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Row 3 — status / taxonomy / source */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FieldLabel>status</FieldLabel>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className={`${fieldBase} h-8 w-32 gap-2 sm:w-36`}>
            <SelectValue placeholder="any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="UnderReview">Under Review</SelectItem>
            <SelectItem value="Published">Published</SelectItem>
            <SelectItem value="Archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        {taxonomies.length > 0 && (
          <>
            <FieldLabel>taxonomy</FieldLabel>
            <Select value={taxonomy} onValueChange={(v) => setTaxonomy(v ?? "all")}>
              <SelectTrigger className={`${fieldBase} h-8 w-36 gap-2 sm:w-40`}>
                <SelectValue placeholder="any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">all</SelectItem>
                {taxonomies.map((t) => (
                  <SelectItem key={t.entity_id} value={t.entity_id}>
                    {t.fields.name ?? t.entity_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {hasSpecimens && (
          <>
            <FieldLabel>source</FieldLabel>
            <Select value={source} onValueChange={(v) => setSource(v ?? "all")}>
              <SelectTrigger className={`${fieldBase} h-8 w-32 gap-2 sm:w-36`}>
                <SelectValue placeholder="all" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">everything</SelectItem>
                <SelectItem value="library">library</SelectItem>
                <SelectItem value="specimens">specimens</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}
