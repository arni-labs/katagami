// Featured membership for one published row. The anonymous gate must accept
// the entity id OR the slug — featuredIds() is id-keyed (list filters), but
// BRIEF.md and other by-id-or-slug doors pass whichever the visitor typed.

export function rowMatchesIdOrSlug(row, idOrSlug) {
  if (!idOrSlug || !row) return false;
  if (row.entity_id === idOrSlug) return true;
  const slug = row.fields?.slug ?? row.fields?.Slug;
  return typeof slug === "string" && slug === idOrSlug;
}
