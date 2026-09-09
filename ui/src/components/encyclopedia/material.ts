import type { CellManifestation, EncyclopediaCell, ManifestationRecord, ManifestationSet } from "@/lib/encyclopedia";

// What a cell can show of itself on the map: a picture, a passage, a palette.
// Every piece comes from a study on the cell or from a record the cell names
// as a manifestation. Nothing here is invented; a cell with none of it is a
// named cell, and the map says so.

export interface MaterialImage {
  /** Where the piece comes from: a study on the cell, or a record the cell names. */
  source: "study" | "record";
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
  /** Where the piece comes from: a study on the cell, or a record the cell names. */
  source: "study" | "record";
  text: string;
  eyebrow: string;
  ink: string;
  title: string;
  note?: string;
  href?: string;
  status?: string;
}

export interface MaterialPalette {
  /** Where the piece comes from: a study on the cell, or a record the cell names. */
  source: "study" | "record";
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

export function cellMaterial(cell: EncyclopediaCell): CellMaterial {
  let image: MaterialImage | null = null;
  for (const study of cell.studies) {
    const rep = study.representations.find((r) => r.kind === "image");
    if (rep && rep.kind === "image") {
      image = { source: "study", url: rep.url, alt: rep.alt, eyebrow: study.kind === "generated" ? `Generated study · ${study.generatedBy ?? ""}`.trim() : study.kind === "original" ? "Original study" : "Art study", ink: "var(--ramune)", title: study.title, note: study.description };
      break;
    }
  }
  const pictured = [...resolved(cell.manifestations, "ArtStyles"), ...resolved(cell.manifestations, "DesignLanguages")].filter((r) => r.image);
  const toImage = (record: ManifestationRecord): MaterialImage => ({ source: "record", url: record.image!, alt: record.name, eyebrow: SET_EYEBROW[record.set], ink: SET_INK[record.set], title: record.name, note: record.line, href: record.href, status: record.status });
  if (!image && pictured[0]) image = toImage(pictured[0]);

  let text: MaterialText | null = null;
  for (const study of cell.studies) {
    const rep = study.representations.find((r) => r.kind === "text");
    if (rep && rep.kind === "text") {
      text = { source: "study", text: rep.text, eyebrow: study.kind === "generated" ? `Generated study · ${study.generatedBy ?? ""}`.trim() : "Writing study", ink: "var(--sakura)", title: study.title, note: `${rep.edition} · ${rep.language}` };
      break;
    }
  }
  if (!text) {
    const record = resolved(cell.manifestations, "WritingStyles").find((r) => r.excerpt);
    if (record) text = { source: "record", text: record.excerpt!, eyebrow: SET_EYEBROW.WritingStyles, ink: SET_INK.WritingStyles, title: record.name, note: record.line, href: record.href, status: record.status };
  }

  let palette: MaterialPalette | null = null;
  for (const study of cell.studies) {
    const rep = study.representations.find((r) => r.kind === "palette");
    if (rep && rep.kind === "palette") {
      palette = { source: "study", swatches: rep.colors.map((c) => c.value), eyebrow: "Palette study", ink: "var(--yuzu)", title: study.title, note: `${rep.colors.length} colors` };
      break;
    }
  }
  if (!palette) {
    const record = resolved(cell.manifestations, "PaletteSystems").find((r) => r.swatches?.length);
    if (record) palette = { source: "record", swatches: record.swatches!, eyebrow: SET_EYEBROW.PaletteSystems, ink: SET_INK.PaletteSystems, title: record.name, note: `${record.swatches!.length} colors`, href: record.href, status: record.status };
  }
  if (!palette && !image) {
    // A design language's token colours stand in as a palette when nothing
    // else pictures the cell.
    const record = resolved(cell.manifestations, "DesignLanguages").find((r) => r.swatches?.length);
    if (record) palette = { source: "record", swatches: record.swatches!, eyebrow: SET_EYEBROW.DesignLanguages, ink: SET_INK.DesignLanguages, title: record.name, note: record.line, href: record.href, status: record.status };
  }

  return { image, text, palette, nameOnly: !image && !text && !palette };
}

/** What a cell shows of itself when the map is far out and there are no words
 *  yet. A picture when the cell has one; failing that the material it does
 *  have — a palette, a passage — so the field reads as material rather than as
 *  a grid of empty boxes. Only a cell with nothing at all falls back to its
 *  name, and the plate says so. Every face carries the caption that says where
 *  it came from; nothing is presented as the cell's own study unless it is. */
export type CellFace =
  | { kind: "image"; url: string; alt: string; caption: string; eyebrow: string; ink: string }
  | { kind: "palette"; swatches: string[]; caption: string; eyebrow: string; ink: string }
  | { kind: "passage"; text: string; caption: string; eyebrow: string; ink: string }
  | { kind: "name"; caption: string; eyebrow: string; note: string; ink: string };

/** Every face a cell can turn, best first. The list always ends in a face that
 *  cannot fail, so a picture whose asset has gone missing steps down to the
 *  next honest thing the cell has instead of leaving the browser's broken
 *  image on the paper. The last face says which of the two it is: a cell with
 *  nothing made for it, or a cell whose picture would not load. */
export function cellFaces(cell: EncyclopediaCell): CellFace[] {
  const m = cellMaterial(cell);
  const from = (piece: { source: "study" | "record"; eyebrow: string; title: string }) =>
    piece.source === "study" ? `${piece.eyebrow} · ${piece.title}` : `from ${piece.title} · ${piece.eyebrow.toLowerCase()}`;
  const faces: CellFace[] = [];
  if (m.image?.source === "study") faces.push({ kind: "image", url: m.image.url, alt: m.image.alt, caption: from(m.image), eyebrow: m.image.eyebrow, ink: m.image.ink });
  if (m.palette?.source === "study") faces.push({ kind: "palette", swatches: m.palette.swatches, caption: from(m.palette), eyebrow: m.palette.eyebrow, ink: m.palette.ink });
  if (m.text?.source === "study") faces.push({ kind: "passage", text: m.text.text, caption: from(m.text), eyebrow: m.text.eyebrow, ink: m.text.ink });
  faces.push(faces.length
    ? { kind: "name", caption: "The picture on this cell would not load", eyebrow: "Picture unavailable", note: "The material is recorded; its asset did not load.", ink: "var(--graphite)" }
    : { kind: "name", caption: cell.manifestations.length ? `No topic study · ${new Set(cell.manifestations.map(m=>m.entitySet+":"+m.entityId)).size} related records` : "No topic study yet", eyebrow: "Topic", note: "Related records are examples connected to this topic, not its defining image.", ink: "var(--ramune)" });
  return faces;
}

/** The face a cell turns before anything has failed. */
export function cellFace(cell: EncyclopediaCell): CellFace {
  return cellFaces(cell)[0];
}
