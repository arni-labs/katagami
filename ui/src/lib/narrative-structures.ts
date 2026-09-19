import { z } from "zod";
import fixture from "@/data/narrative-structures.json";

const movementPartSchema = z.object({
  position: z.number().int().positive(),
  name: z.string().min(1),
});

const orderedPartsSchema = z.array(movementPartSchema).min(1).superRefine((parts, context) => {
  parts.forEach((part, index) => {
    if (part.position !== index + 1) {
      context.addIssue({
        code: "custom",
        message: `movement ${index + 1} has position ${part.position}`,
        path: [index, "position"],
      });
    }
  });
});

const movementsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixed"), parts: orderedPartsSchema }),
  z.object({
    kind: z.literal("rule"),
    rule: z.string().min(1),
    example: orderedPartsSchema,
  }),
]);

const exemplarSchema = z.object({
  work: z.string().min(1),
  creator: z.string().min(1).optional(),
});

const sourceSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  handling: z.enum(["public_domain", "cited_and_paraphrased"]),
});

const fixtureSchema = z.object({
  records: z.array(
    z.object({
      id: z.string().min(1),
      params: z.record(z.string(), z.string()),
    }),
  ),
});

export type NarrativeMovements = z.infer<typeof movementsSchema>;
export type NarrativeMovement = z.infer<typeof movementPartSchema>;
export type NarrativeSource = z.infer<typeof sourceSchema>;

export interface NarrativeStructure {
  id: string;
  name: string;
  slug: string;
  status: string;
  aliases: string[];
  instruction: string;
  movements: NarrativeMovements;
  exemplars: z.infer<typeof exemplarSchema>[];
  sources: NarrativeSource[];
  encyclopediaCellIds: string[];
}

export interface NarrativeStructureRow {
  entity_id: string;
  status: string;
  fields: Record<string, string | undefined>;
}

function requiredField(fields: Record<string, string | undefined>, key: string): string {
  const value = fields[key];
  if (!value) throw new Error(`NarrativeStructure is missing ${key}`);
  return value;
}

function parseJsonField<T>(
  fields: Record<string, string | undefined>,
  key: string,
  schema: z.ZodType<T>,
): T {
  const value = requiredField(fields, key);
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch (error) {
    throw new Error(`NarrativeStructure ${key} is not JSON`, { cause: error });
  }
  return schema.parse(decoded);
}

export function toNarrativeStructure(row: NarrativeStructureRow): NarrativeStructure {
  return {
    id: row.entity_id,
    name: requiredField(row.fields, "name"),
    slug: requiredField(row.fields, "slug"),
    status: row.status,
    aliases: parseJsonField(row.fields, "aliases", z.array(z.string().min(1))),
    instruction: requiredField(row.fields, "instruction"),
    movements: parseJsonField(row.fields, "movements", movementsSchema),
    exemplars: parseJsonField(row.fields, "exemplars", z.array(exemplarSchema).min(2)),
    sources: parseJsonField(row.fields, "sources", z.array(sourceSchema).min(1)),
    encyclopediaCellIds: parseJsonField(
      row.fields,
      "encyclopedia_cell_ids",
      z.array(z.string().min(1)),
    ),
  };
}

const parsedFixture = fixtureSchema.parse(fixture);

export const narrativeStructureFixture: NarrativeStructure[] = parsedFixture.records
  .map((record) =>
    toNarrativeStructure({
      entity_id: record.id,
      status: "Draft",
      fields: record.params,
    }),
  )
  .sort((left, right) => left.name.localeCompare(right.name));

export function orderedMovements(movements: NarrativeMovements): NarrativeMovement[] {
  return movements.kind === "fixed" ? movements.parts : movements.example;
}

export function buildStructureHandoff(structure: NarrativeStructure): string {
  const movements = orderedMovements(structure.movements)
    .map((movement) => `${movement.position}. ${movement.name}`)
    .join("\n");
  const movementBlock =
    structure.movements.kind === "fixed"
      ? `Required movements:\n${movements}\n\nKeep every movement in this order.`
      : `Rule: ${structure.movements.rule}\n\nAdaptable example:\n${movements}\n\nAdapt the number of units as the rule permits.`;
  const exemplars = structure.exemplars
    .map((exemplar) => exemplar.creator ? `${exemplar.work} (${exemplar.creator})` : exemplar.work)
    .join("; ");

  return [
    `Structure this work with ${structure.name}.`,
    "",
    `Instruction: ${structure.instruction}`,
    "",
    movementBlock,
    "",
    `Reference works: ${exemplars}.`,
    "",
    "First make an outline that assigns the intended material to every movement. Draft the work only after the outline is complete.",
  ].join("\n");
}
