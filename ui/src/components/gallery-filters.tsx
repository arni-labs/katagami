"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fieldBase =
  "rounded-none border-0 border-b border-dashed border-foreground/30 bg-transparent px-1 font-mono text-sm text-foreground shadow-none focus-visible:border-solid focus-visible:border-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0";

export function GalleryFilters({
  taxonomies,
  initialStatus = "Published",
  initialTaxonomy = "all",
  initialSearch = "",
}: {
  taxonomies: { entity_id: string; fields: { name?: string } }[];
  initialStatus?: string;
  initialTaxonomy?: string;
  initialSearch?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [taxonomy, setTaxonomy] = useState(initialTaxonomy);
  const [search, setSearch] = useState(initialSearch);

  const applyFilters = useCallback(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-gallery-card]"),
    );
    let visibleCount = 0;

    for (const card of cards) {
      const cardStatus = card.dataset.status ?? "";
      const cardTaxonomies = (card.dataset.taxonomyIds ?? "")
        .split("\t")
        .filter(Boolean);
      const cardSearch = card.dataset.searchText ?? "";
      const matchesStatus = status === "all" || cardStatus === status;
      const matchesTaxonomy =
        taxonomy === "all" || cardTaxonomies.includes(taxonomy);
      const matchesSearch =
        !normalizedSearch || cardSearch.includes(normalizedSearch);
      const visible = matchesStatus && matchesTaxonomy && matchesSearch;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    }

    const empty = document.querySelector<HTMLElement>("[data-gallery-empty]");
    if (empty) empty.hidden = visibleCount > 0;
  }, [status, taxonomy, search]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (status && status !== "Published") {
        params.set("status", status);
      } else {
        params.delete("status");
      }
      if (taxonomy && taxonomy !== "all") {
        params.set("taxonomy", taxonomy);
      } else {
        params.delete("taxonomy");
      }
      if (search.trim()) {
        params.set("q", search.trim());
      } else {
        params.delete("q");
      }
      const query = params.toString();
      const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", next);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [status, taxonomy, search]);

  return (
    <div className="relative flex min-w-0 max-w-full flex-wrap items-center gap-x-5 gap-y-3 overflow-hidden bg-card/65 px-5 py-4 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)] backdrop-blur-[4px] sm:overflow-visible">
      {/* washi tape corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 -top-2 h-[14px] w-16 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--salad) 75%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--salad) 35%, var(--paper-tape-mix)) 6px 12px)",
          transform: "rotate(-6deg)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -bottom-2 h-[12px] w-12 rounded-[1px] opacity-75 shadow-[0_1px_2px_rgba(30,35,45,0.05)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--sakura) 70%, var(--paper-tape-mix)) 0 6px, color-mix(in oklch, var(--sakura) 30%, var(--paper-tape-mix)) 6px 12px)",
          transform: "rotate(4deg)",
        }}
      />

      {/* "find" stamp */}
      <span className="stamp text-[var(--sumire)]">find</span>

      {/* Search field with magnifier */}
      <div className="relative min-w-[140px] max-w-[300px] flex-1">
        <Search className="pointer-events-none absolute left-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="search languages…"
          className={`${fieldBase} h-8 w-full pl-6 placeholder:text-muted-foreground/70`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
      </div>

      {/* Filter label + selects */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FieldLabel>status</FieldLabel>
        <Select
          value={status}
          onValueChange={(v) => {
            const next = v ?? "all";
            setStatus(next);
          }}
        >
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
            <Select
              value={taxonomy}
              onValueChange={(v) => {
                const next = v ?? "all";
                setTaxonomy(next);
              }}
            >
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
