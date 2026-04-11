"use client";

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

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search languages..."
        className="w-56"
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(e) => update("q", e.target.value)}
      />
      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(v) => update("status", v)}
      >
        <SelectTrigger className="w-40">
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
          defaultValue={searchParams.get("taxonomy") ?? "all"}
          onValueChange={(v) => update("taxonomy", v)}
        >
          <SelectTrigger className="w-48">
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
