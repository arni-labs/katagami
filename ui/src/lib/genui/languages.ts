import "server-only";
import { searchDesigns } from "@/lib/catalog";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";

/** Every language the caller may see, by name: the lab pages' pickers. */
export async function visibleLanguages() {
  const tier = (await hasFullGalleryAccess()) ? "full" : "sample";
  const out: { id: string; name: string }[] = [];
  let cursor: number | null = 0;
  while (cursor !== null) {
    const page = await searchDesigns("language", tier, { limit: 100, cursor });
    out.push(...page.results.map((r) => ({ id: r.id, name: r.name })));
    cursor = page.next_cursor;
  }
  return { tier, languages: out.sort((a, b) => a.name.localeCompare(b.name)) };
}
