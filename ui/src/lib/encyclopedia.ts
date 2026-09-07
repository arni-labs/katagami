import "server-only";
import { cache } from "react";
import { listEncyclopediaRows, listDesignLanguages, listArtStyles, listPaletteSystems } from "@/lib/odata";
import { hasFullGalleryAccess } from "@/lib/entity-visibility";
import { featuredIds } from "@/lib/catalog";
import { parsePublishedCell, visibleCells } from "@/lib/encyclopedia-public";
import { buildCellGraph } from "@/lib/encyclopedia-graph";

export const getEncyclopedia = cache(async () => {
  const cells = (await listEncyclopediaRows()).map(parsePublishedCell);
  const references = cells.flatMap((cell) => cell.document.manifestations
    .flatMap((example) => example.representations.filter((representation) => representation.kind === "katagami")));
  const allowedReferences = new Set<string>();
  if (references.length) {
    const fullAccess = await hasFullGalleryAccess();
    const lanes = [
      { entitySet: "DesignLanguages", kind: "language", list: listDesignLanguages },
      { entitySet: "ArtStyles", kind: "art_style", list: listArtStyles },
      { entitySet: "PaletteSystems", kind: "palette", list: listPaletteSystems },
    ] as const;
    for (const lane of lanes) {
      if (!references.some((reference) => reference.entitySet === lane.entitySet)) continue;
      const shelf = fullAccess ? null : await featuredIds(lane.kind);
      for (const work of await lane.list("Status eq 'Published'")) {
        if (work.status === "Published" && (!shelf || shelf.has(work.entity_id))) {
          allowedReferences.add(`${lane.entitySet}:${work.entity_id}`);
        }
      }
    }
    // Writing-style records currently have an owner-only surface. They are not
    // projected here; historical writing examples can be read independently.
  }
  return buildCellGraph(visibleCells(cells, allowedReferences));
});
