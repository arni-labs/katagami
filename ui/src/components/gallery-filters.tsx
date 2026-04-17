"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
}: {
  taxonomies: { entity_id: string; fields: { name?: string } }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [taxonomy, setTaxonomy] = useState(
    searchParams.get("taxonomy") ?? "all",
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const navigate = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="relative flex flex-wrap items-center gap-x-5 gap-y-3 bg-white/65 px-5 py-4 shadow-[0_1px_2px_rgba(30,35,45,0.04),0_4px_14px_rgba(30,35,45,0.05)] backdrop-blur-[4px]">
      {/* washi tape corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-3 -top-2 h-[14px] w-16 rounded-[1px] opacity-80 shadow-[0_1px_2px_rgba(30,35,45,0.06)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--salad) 75%, white) 0 6px, color-mix(in oklch, var(--salad) 35%, white) 6px 12px)",
          transform: "rotate(-6deg)",
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-3 -bottom-2 h-[12px] w-12 rounded-[1px] opacity-75 shadow-[0_1px_2px_rgba(30,35,45,0.05)]"
        style={{
          background:
            "repeating-linear-gradient(45deg, color-mix(in oklch, var(--sakura) 70%, white) 0 6px, color-mix(in oklch, var(--sakura) 30%, white) 6px 12px)",
          transform: "rotate(4deg)",
        }}
      />

      {/* "find" stamp */}
      <span className="stamp text-[var(--sumire)]">find</span>

      {/* Search field with magnifier */}
      <div className="relative flex-1 min-w-[180px] max-w-[300px]">
        <Search className="pointer-events-none absolute left-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="search languages…"
          className={`${fieldBase} h-8 w-full pl-6 placeholder:text-muted-foreground/70`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            navigate("q", e.target.value);
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
            navigate("status", next);
          }}
        >
          <SelectTrigger className={`${fieldBase} h-8 w-36 gap-2`}>
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
                navigate("taxonomy", next);
              }}
            >
              <SelectTrigger className={`${fieldBase} h-8 w-40 gap-2`}>
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
