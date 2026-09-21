import { createHash } from "node:crypto";
import { z } from "zod";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const nonempty = z.string().trim().min(1);
const galleryModel = z.object({ provider: nonempty, model: nonempty.nullable() }).strict();
const execution = z.object({
  route: z.enum(["builtin", "provider"]), harness: nonempty, tool: nonempty,
  receipt: nonempty, requested_model: nonempty, provider_request_id: nonempty.nullable(),
}).strict();

export const artStyleGalleryImages = z.array(z.object({
  file_id: z.string().min(1),
  subject: z.string().trim().min(1),
  model: galleryModel,
  generation_record: z.object({
    schema_version: z.literal("2"),
    kind: z.literal("art_style_gallery"),
    mode: z.literal("text_to_image"),
    input_image_file_ids: z.array(z.string()).length(0),
    execution,
    style_slug: z.string().min(1),
    prompt: z.string().min(1),
    canonical_prompt_sha256: sha256,
    output: z.object({
      file_id: z.string().min(1),
      sha256,
      prompt_sha256: sha256,
    }).strict(),
  }).strict(),
}).strict().superRefine((image, context) => {
  const { route, harness, provider_request_id } = image.generation_record.execution;
  const { provider, model } = image.model;
  if (
      (route === "provider" && (model === null || provider_request_id === null)) ||
      (route === "builtin" && !((harness === "codex" && provider === "OpenAI") || (harness === "grok" && provider === "xAI"))))
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Gallery execution must record the actual route, requested model and available provenance" });
}));

/** Validate bindings before creating or mutating a Draft, then preserve the
 * full records for the independent finalizer's locked-file verification. */
export function gallerySubmissionFields(
  images: z.infer<typeof artStyleGalleryImages>,
  slug: string,
  canonicalPrompt: string,
  thumbnailFileId: string,
  proofFileIds: string[] = [],
) {
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const ids = images.map(image => image.file_id);
  const hashes = images.map(image => image.generation_record.output.sha256);
  if (new Set(ids).size !== images.length || new Set(hashes).size !== images.length)
    throw new Error("Gallery file IDs and output hashes must be unique");
  if (![...ids, ...proofFileIds].includes(thumbnailFileId))
    throw new Error("thumbnail_file_id must identify a gallery or proof image");
  for (const image of images) {
    const record = image.generation_record;
    const prompt = `${canonicalPrompt}\n\nSubject and scene:\n${image.subject}`;
    if (record.style_slug !== slug || record.output.file_id !== image.file_id ||
        record.prompt !== prompt || record.canonical_prompt_sha256 !== digest(canonicalPrompt) ||
        record.output.prompt_sha256 !== digest(prompt))
      throw new Error(`Gallery image '${image.file_id}' has inconsistent style, file, or prompt bindings`);
  }
  return {
    reference_image_file_ids: ids,
    reference_manifest: JSON.stringify({ schema_version: "3", items: images }),
  };
}
