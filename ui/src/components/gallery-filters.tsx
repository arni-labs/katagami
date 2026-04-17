"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GalleryFilters({
  taxonomies,
}: {
  taxonomies: { entity_id: string; fields: { name?: string } }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [taxonomy, setTaxonomy] = useState(searchParams.get("taxonomy") ?? "all");
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
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-border bg-card/80 p-3 shadow-[var(--shadow-paper-sm)] backdrop-blur-sm">
      <div className="flex items-center gap-2 pl-1 pr-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--teal)]" />
        find
      </div>
      <Input
        placeholder="search languages…"
        className="w-60 border-border bg-background focus-visible:border-foreground/40 focus-visible:ring-[var(--sumire)]"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          navigate("q", e.target.value);
        }}
      />
      <Select
        value={status}
        onValueChange={(v) => {
          setStatus(v);
          navigate("status", v);
        }}
      >
        <SelectTrigger className="w-40 border-border bg-background">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="Draft">Draft</SelectItem>
          <SelectItem value="UnderReview">Under Review</SelectItem>
          <SelectItem value="Published">Published</SelectItem>
          <SelectItem value="Archived">Archived</SelectItem>
        </SelectContent>
      </Select>
      {taxonomies.length > 0 && (
        <Select
          value={taxonomy}
          onValueChange={(v) => {
            setTaxonomy(v);
            navigate("taxonomy", v);
          }}
        >
          <SelectTrigger className="w-48 border-border bg-background">
            <SelectValue placeholder="Taxonomy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All taxonomies</SelectItem>
            {taxonomies.map((t) => (
              <SelectItem key={t.entity_id} value={t.entity_id}>
                {t.fields.name ?? t.entity_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
