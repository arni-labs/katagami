import { z } from "zod";

const text = z.string()
  .refine((value) => value.trim().length > 0, "Must not be blank")
  .refine((value) => Array.from(value).length <= 100_000, "Must not exceed 100,000 Unicode code points");
const id = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/);
const httpsUrl = z.url().pipe(z.string().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use an HTTPS URL without credentials"));
const sourceIds = z.array(id).min(1);

const encyclopediaMapSchema = z.enum(["art", "writing", "palettes", "design"]);

const sourceSchema = z.strictObject({ id, title: text, url: httpsUrl });
const rightsSchema = z.strictObject({
  basis: z.enum(["public-domain", "cc0", "open-license", "permission", "original"]),
  evidenceUrl: httpsUrl,
  jurisdiction: text,
  uses: z.array(z.enum(["display", "adapt", "download"])).min(1)
    .refine((uses) => uses.includes("display"), "Display permission must be recorded"),
  attribution: text,
  restrictions: z.array(text),
});

const representationFields = { id, sourceId: id, rights: rightsSchema };
const representationSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...representationFields, kind: z.literal("image"), url: httpsUrl, alt: text }),
  z.strictObject({ ...representationFields, kind: z.literal("text"), text, language: text, edition: text }),
  z.strictObject({
    ...representationFields,
    kind: z.literal("palette"),
    colors: z.array(z.strictObject({ name: text, value: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).min(1),
    construction: text,
  }),
]);

const manifestationSchema = z.strictObject({
  entitySet: z.enum(["DesignLanguages", "ArtStyles", "WritingStyles", "PaletteSystems"]),
  entityId: id,
  explanation: text,
  sourceIds,
});

// Where a study came from must be unmistakable to a reader. A generated study
// names what generated it; a historical or original one carries no such claim.
const studySchema = z.strictObject({
  id,
  title: text,
  kind: z.enum(["historical", "original", "generated"]),
  description: text,
  generatedBy: text.optional(),
  representations: z.array(representationSchema).min(1),
}).superRefine((study, context) => {
  if (study.kind === "generated" && !study.generatedBy) {
    context.addIssue({ code: "custom", path: ["generatedBy"], message: "A generated study must name the model or tool that produced it" });
  }
  if (study.kind !== "generated" && study.generatedBy !== undefined) {
    context.addIssue({ code: "custom", path: ["generatedBy"], message: "Only a generated study names a generator" });
  }
});

// A cell says where its own account comes from. "cited" means at least one
// source a reader can follow; "recollected" means the model wrote it from
// training data and nothing external was located, which the note must say.
const provenanceSchema = z.strictObject({
  basis: z.enum(["cited", "recollected"]),
  note: text.optional(),
});

export const cellDocumentSchema = z.strictObject({
  version: z.literal(2),
  name: text,
  description: z.union([z.literal(""), text]),
  provenance: provenanceSchema,
  maps: z.array(encyclopediaMapSchema).min(1),
  broader: z.array(z.strictObject({ cellId: id, explanation: text, sourceIds })),
  relations: z.array(z.strictObject({ cellId: id, label: text, explanation: text, sourceIds })),
  questions: z.array(text),
  sources: z.array(sourceSchema),
  manifestations: z.array(manifestationSchema),
  studies: z.array(studySchema),
}).superRefine((cell, context) => {
  if (new TextEncoder().encode(JSON.stringify(cell)).byteLength > 2_000_000) {
    context.addIssue({ code: "custom", message: "Document must not exceed 2,000,000 UTF-8 bytes" });
  }
  function unique(values: string[], path: (string | number)[]) {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: "custom", path, message: "Identifiers must be unique within this list" });
    }
  }
  if (cell.provenance.basis === "cited" && cell.sources.length === 0) {
    context.addIssue({ code: "custom", path: ["provenance"], message: "A cited cell must carry at least one source" });
  }
  if (cell.provenance.basis === "recollected" && cell.sources.length > 0) {
    context.addIssue({ code: "custom", path: ["provenance"], message: "A cell with a source is cited, not recollected" });
  }
  if (cell.provenance.basis === "recollected" && !cell.provenance.note) {
    context.addIssue({ code: "custom", path: ["provenance", "note"], message: "A recollected cell must say that it was written from training data and why no source was found" });
  }
  unique(cell.maps, ["maps"]);
  unique(cell.sources.map((source) => source.id), ["sources"]);
  unique(cell.manifestations.map((entry) => `${entry.entitySet}:${entry.entityId}`), ["manifestations"]);
  unique(cell.studies.map((example) => example.id), ["studies"]);
  unique(cell.broader.map((link) => link.cellId), ["broader"]);
  const knownSources = new Set(cell.sources.map((source) => source.id));
  function checkSources(ids: string[], path: (string | number)[]) {
    for (const sourceId of ids) {
      if (!knownSources.has(sourceId)) {
        context.addIssue({ code: "custom", path, message: `Unknown source: ${sourceId}` });
      }
    }
  }
  for (const field of ["broader", "relations"] as const) {
    cell[field].forEach((link, index) => checkSources(link.sourceIds, [field, index, "sourceIds"]));
  }
  cell.manifestations.forEach((entry, index) => checkSources(entry.sourceIds, ["manifestations", index, "sourceIds"]));
  cell.studies.forEach((example, index) => {
    unique(example.representations.map((representation) => representation.id), ["studies", index, "representations"]);
    example.representations.forEach((representation, representationIndex) => {
      checkSources([representation.sourceId], ["studies", index, "representations", representationIndex, "sourceId"]);
    });
  });
});
