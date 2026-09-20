import { createHash } from "node:crypto";
import { z } from "zod";

const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const galleryModel = z.union([
  z.object({ provider: z.literal("OpenAI"), model: z.enum([
    "gpt-image-2.5", "openai/gpt-image-2.5/sunburst/text-to-image",
    "openai/gpt-image-2.5/flare/text-to-image",
  ]).nullable() }).strict(),
  z.object({ provider: z.literal("xAI"), model: z.enum([
    "grok-imagine-image", "grok-imagine-image-v2", "xai/grok-imagine-image/v2.0/text-to-image",
  ]).nullable() }).strict(),
  z.object({ provider: z.literal("Google"), model: z.enum([
    "fal-ai/nano-banana-pro", "gemini-3-pro-image-preview",
  ]) }).strict(),
]);
const nonempty = z.string().trim().min(1);
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
  const { route, harness, requested_model, provider_request_id } = image.generation_record.execution;
  const { provider, model } = image.model;
  const requested = provider === "OpenAI" ? "GPT Image 2.5" : provider === "xAI" ? "Grok Image" : "Nano Banana";
  if (requested_model !== requested ||
      (route === "provider" && (model === null || provider_request_id === null)) ||
      (route === "builtin" && !((harness === "codex" && provider === "OpenAI") || (harness === "grok" && provider === "xAI"))))
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Gallery execution must record the actual route, requested model and available provenance" });
})).length(6).refine(items =>
  items.filter(i => i.model.provider === "OpenAI").length === 4 &&
  items.filter(i => i.model.provider === "xAI").length === 1 &&
  items.filter(i => i.model.provider === "Google").length === 1,
{ message: "Gallery requires four GPT Image 2.5 images, one Grok Image image, and one Nano Banana image" });

/** Validate bindings before creating or mutating a Draft, then preserve the
 * full records for the independent finalizer's locked-file verification. */
export function gallerySubmissionFields(
  images: z.infer<typeof artStyleGalleryImages>,
  slug: string,
  canonicalPrompt: string,
  thumbnailFileId: string,
) {
  const digest = (value: string) => createHash("sha256").update(value).digest("hex");
  const ids = images.map(image => image.file_id);
  const hashes = images.map(image => image.generation_record.output.sha256);
  if (new Set(ids).size !== images.length || new Set(hashes).size !== images.length)
    throw new Error("Gallery file IDs and output hashes must be unique");
  if (thumbnailFileId !== ids[0])
    throw new Error("thumbnail_file_id must identify the first gallery image");
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
