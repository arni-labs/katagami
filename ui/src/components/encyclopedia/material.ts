import type { CellManifestation, EncyclopediaCell, ManifestationRecord, ManifestationSet } from "@/lib/encyclopedia";
import type { GraphIndex } from "@/lib/encyclopedia-graph";

// What a cell can show of itself on the map: a picture, a passage, a palette.
// Every piece comes from a study on the cell or from a record the cell names
// as a manifestation. Nothing here is invented; a cell with none of it is a
// named cell, and the map says so.

export interface MaterialImage {
  url: string;
  alt: string;
  /** Eyebrow: ART STUDY for a study, else the record's set. */
  eyebrow: string;
  ink: string;
  title: string;
  note?: string;
  href?: string;
  status?: string;
}

export interface MaterialText {
  text: string;
  eyebrow: string;
  ink: string;
  title: string;
  note?: string;
  href?: string;
  status?: string;
}

export interface MaterialPalette {
  swatches: string[];
  eyebrow: string;
  ink: string;
  title: string;
  note?: string;
  href?: string;
  status?: string;
}

export interface CellMaterial {
  image: MaterialImage | null;
  /** A second picture from another record, for cells that have only pictures. */
  secondImage: MaterialImage | null;
  text: MaterialText | null;
  palette: MaterialPalette | null;
  /** True when the cell has nothing to show but its name and scope. */
  nameOnly: boolean;
}

export const SET_EYEBROW: Record<ManifestationSet, string> = {
  ArtStyles: "Art style",
  DesignLanguages: "Design language",
  WritingStyles: "Writing style",
  PaletteSystems: "Palette",
};

export const SET_SHORT: Record<ManifestationSet, string> = {
  ArtStyles: "Art",
  DesignLanguages: "Design",
  WritingStyles: "Writing",
  PaletteSystems: "Palette",
};

/** Eyebrow inks follow the references: art in ramune, writing in sakura,
 *  palette in yuzu (darkened for contrast), design in the quiet teal. */
export const SET_INK: Record<ManifestationSet, string> = {
  ArtStyles: "var(--ramune)",
  DesignLanguages: "var(--teal)",
  WritingStyles: "var(--sakura)",
  PaletteSystems: "var(--yuzu)",
};

function resolved(list: CellManifestation[], set: ManifestationSet): ManifestationRecord[] {
  return list.filter((m) => m.entitySet === set && m.record).map((m) => m.record!);
}

function truncate(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function cellMaterial(cell: EncyclopediaCell): CellMaterial {
  let image: MaterialImage | null = null;
  for (const study of cell.studies) {
    const rep = study.representations.find((r) => r.kind === "image");
    if (rep && rep.kind === "image") {
      image = { url: rep.url, alt: rep.alt, eyebrow: study.kind === "generated" ? `Generated study · ${study.generatedBy ?? ""}`.trim() : study.kind === "original" ? "Original study" : "Art study", ink: "var(--ramune)", title: study.title, note: study.description };
      break;
    }
  }
  const pictured = [...resolved(cell.manifestations, "ArtStyles"), ...resolved(cell.manifestations, "DesignLanguages")].filter((r) => r.image);
  const toImage = (record: ManifestationRecord): MaterialImage => ({ url: record.image!, alt: record.name, eyebrow: SET_EYEBROW[record.set], ink: SET_INK[record.set], title: record.name, note: record.line, href: record.href, status: record.status });
  if (!image && pictured[0]) image = toImage(pictured[0]);
  const secondImage = pictured.find((r) => r.image !== image?.url) ? toImage(pictured.find((r) => r.image !== image?.url)!) : null;

  let text: MaterialText | null = null;
  for (const study of cell.studies) {
    const rep = study.representations.find((r) => r.kind === "text");
    if (rep && rep.kind === "text") {
      text = { text: rep.text, eyebrow: study.kind === "generated" ? `Generated study · ${study.generatedBy ?? ""}`.trim() : "Writing study", ink: "var(--sakura)", title: study.title, note: `${rep.edition} · ${rep.language}` };
      break;
    }
  }
  if (!text) {
    const record = resolved(cell.manifestations, "WritingStyles").find((r) => r.excerpt);
    if (record) text = { text: record.excerpt!, eyebrow: SET_EYEBROW.WritingStyles, ink: SET_INK.WritingStyles, title: record.name, note: record.line, href: record.href, status: record.status };
  }

  let palette: MaterialPalette | null = null;
  for (const study of cell.studies) {
    const rep = study.representations.find((r) => r.kind === "palette");
    if (rep && rep.kind === "palette") {
      palette = { swatches: rep.colors.map((c) => c.value), eyebrow: "Palette study", ink: "var(--yuzu)", title: study.title, note: `${rep.colors.length} colors` };
      break;
    }
  }
  if (!palette) {
    const record = resolved(cell.manifestations, "PaletteSystems").find((r) => r.swatches?.length);
    if (record) palette = { swatches: record.swatches!, eyebrow: SET_EYEBROW.PaletteSystems, ink: SET_INK.PaletteSystems, title: record.name, note: `${record.swatches!.length} colors`, href: record.href, status: record.status };
  }
  if (!palette && !image) {
    // A design language's token colours stand in as a palette when nothing
    // else pictures the cell.
    const record = resolved(cell.manifestations, "DesignLanguages").find((r) => r.swatches?.length);
    if (record) palette = { swatches: record.swatches!, eyebrow: SET_EYEBROW.DesignLanguages, ink: SET_INK.DesignLanguages, title: record.name, note: record.line, href: record.href, status: record.status };
  }

  return { image, secondImage, text, palette, nameOnly: !image && !text && !palette };
}

/** A short, honest excerpt for a small card. */
export function excerpt(text: string, max = 150): string {
  return truncate(text, max);
}

/** How many kinds of material a cell can show — used to pick the opening
 *  focus: the richest cell, then the best connected. */
export function materialScore(cell: EncyclopediaCell, index: GraphIndex): number {
  const m = cellMaterial(cell);
  const kinds = [m.image, m.text, m.palette].filter(Boolean).length;
  return kinds * 100 + index.neighbours(cell.id).length * 10 + cell.manifestations.length;
}

export function openingCell(index: GraphIndex): EncyclopediaCell | null {
  let best: EncyclopediaCell | null = null;
  let bestScore = -1;
  for (const cell of index.graph.cells) {
    const score = materialScore(cell, index);
    if (score > bestScore || (score === bestScore && best && cell.name < best.name)) { best = cell; bestScore = score; }
  }
  return best;
}
