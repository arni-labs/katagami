import { createHash } from "node:crypto";
import { z } from "zod";
import { cellDocumentSchema, type EncyclopediaCell } from "./encyclopedia-schema.ts";

const publishedRow = z.object({
  entity_id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/),
  status: z.literal("Published"),
  booleans: z.object({ document_validated: z.literal(true), review_approved: z.literal(true) }),
  fields: z.object({
    document: z.string().refine((value) => Buffer.byteLength(value, "utf8") <= 2_000_000, "Document exceeds 2 MB"),
    document_hash: z.string().regex(/^[a-f0-9]{64}$/),
    review_document_hash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});

export function parsePublishedCell(row: unknown): EncyclopediaCell {
  const record = publishedRow.parse(row);
  const { document, document_hash, review_document_hash } = record.fields;
  if (createHash("sha256").update(document).digest("hex") !== document_hash || review_document_hash !== document_hash) {
    throw new Error(`Encyclopedia cell ${record.entity_id} does not match its validation and review`);
  }
  return { id: record.entity_id, document: cellDocumentSchema.parse(JSON.parse(document)) };
}

export function visibleCells(cells: EncyclopediaCell[], allowedReferences: ReadonlySet<string>): EncyclopediaCell[] {
  const visible = cells.filter((cell) => cell.document.manifestations.every((entry) =>
    allowedReferences.has(`${entry.entitySet}:${entry.entityId}`)));
  const visibleIds = new Set(visible.map((cell) => cell.id));
  const withheldIds = new Set(cells.filter((cell) => !visibleIds.has(cell.id)).map((cell) => cell.id));
  // Remove known withheld targets rather than disclose their identifiers as gaps.
  return visible.map((cell) => ({
    ...cell,
    document: {
      ...cell.document,
      broader: cell.document.broader.filter((link) => !withheldIds.has(link.cellId)),
      relations: cell.document.relations.filter((link) => !withheldIds.has(link.cellId)),
    },
  }));
}
