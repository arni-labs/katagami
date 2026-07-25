import { createHash, createHmac } from "node:crypto";
import { config } from "./config.js";
import {
  getEntity,
  ingestImageWithDigest,
  temperAction,
  TemperError,
  type Identity,
} from "./temper.js";

export const ART_STYLE_PROOF_CATEGORIES = [
  "human_portrait",
  "nonhuman_living",
  "still_life_object",
  "landscape_environment",
] as const;

export const ART_STYLE_SOURCE_MEDIA = [
  "documentary photograph",
  "black-ink line drawing",
  "neutral synthetic 3d render",
  "flat vector illustration",
] as const;

export type ArtStyleProofCategory = (typeof ART_STYLE_PROOF_CATEGORIES)[number];
export type ArtStyleSourceMedium = (typeof ART_STYLE_SOURCE_MEDIA)[number];

export type ArtStyleMatrixCase = {
  category: ArtStyleProofCategory;
  subject: string;
  composition: string;
  source_medium: ArtStyleSourceMedium;
};

export type ArtStyleGenerationReceipt = {
  schema_version: "1";
  issuer: "katagami-mcp";
  kind: "art_style_proof";
  style_slug: string;
  category: ArtStyleProofCategory;
  subject: string;
  composition: string;
  source_medium: ArtStyleSourceMedium;
  source: {
    file_id: string;
    sha256: string;
    endpoint: string;
    request_id: string;
    prompt_sha256: string;
  };
  output: {
    file_id: string;
    sha256: string;
    endpoint: string;
    request_id: string;
    prompt_sha256: string;
    seed: string;
  };
  signature: string;
};

type FalResult = {
  requestId: string;
  data: Record<string, unknown>;
};

const SOURCE_ENDPOINT = "fal-ai/flux/schnell";
const EDIT_ENDPOINTS = [
  "openai/gpt-image-2/edit",
  "fal-ai/nano-banana-2/edit",
] as const;

const sourceMediumDirection: Record<ArtStyleSourceMedium, string> = {
  "documentary photograph":
    "a synthetic documentary photograph with neutral natural lighting, believable materials, and no cinematic grading",
  "black-ink line drawing":
    "a clean black-ink line drawing on plain white paper, with no color, wash, hatching style, or decorative frame",
  "neutral synthetic 3d render":
    "a neutral synthetic 3D render with simple matte materials, soft white studio lighting, and no stylized surface treatment",
  "flat vector illustration":
    "a plain flat vector illustration with simple neutral local colors, clean geometry, and no texture or signature visual style",
};

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function receiptMessage(receipt: Omit<ArtStyleGenerationReceipt, "signature">): string {
  return [
    receipt.schema_version,
    receipt.issuer,
    receipt.kind,
    receipt.style_slug,
    receipt.category,
    receipt.subject,
    receipt.composition,
    receipt.source_medium,
    receipt.source.file_id,
    receipt.source.sha256,
    receipt.source.endpoint,
    receipt.source.request_id,
    receipt.source.prompt_sha256,
    receipt.output.file_id,
    receipt.output.sha256,
    receipt.output.endpoint,
    receipt.output.request_id,
    receipt.output.prompt_sha256,
    receipt.output.seed,
  ].join("\n");
}

function signReceipt(
  receipt: Omit<ArtStyleGenerationReceipt, "signature">,
): ArtStyleGenerationReceipt {
  if (!config.artStyleProofReceiptKey)
    throw new TemperError("ART_STYLE_PROOF_RECEIPT_KEY is not configured", 503);
  return {
    ...receipt,
    signature: createHmac("sha256", config.artStyleProofReceiptKey)
      .update(receiptMessage(receipt))
      .digest("hex"),
  };
}

function assertReceiptSafeText(label: string, value: string): void {
  if (!value.trim() || value.includes("\n") || value.includes("\r"))
    throw new TemperError(`${label} must be nonempty single-line text`, 400);
}

function validateMatrix(cases: ArtStyleMatrixCase[]): void {
  if (cases.length !== 4) throw new TemperError("Exactly four proof cases are required", 400);
  const categories = new Set(cases.map((item) => item.category));
  const media = new Set(cases.map((item) => item.source_medium));
  if (
    ART_STYLE_PROOF_CATEGORIES.some((category) => !categories.has(category)) ||
    ART_STYLE_SOURCE_MEDIA.some((medium) => !media.has(medium))
  ) {
    throw new TemperError(
      "The matrix needs one human portrait, non-human living subject, still-life/object, and landscape/environment across four distinct source media",
      400,
    );
  }
  for (const item of cases) {
    assertReceiptSafeText("subject", item.subject);
    assertReceiptSafeText("composition", item.composition);
  }
}

async function falJson(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  if (!config.falKey) throw new TemperError("FAL_KEY is not configured", 503);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${config.falKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const raw = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    throw new TemperError(`fal returned non-JSON (${response.status})`, 502);
  }
  if (!response.ok)
    throw new TemperError(`fal request failed (${response.status}): ${raw.slice(0, 500)}`, 502);
  return body;
}

async function falQueueRun(endpoint: string, input: Record<string, unknown>): Promise<FalResult> {
  const submitted = await falJson(`https://queue.fal.run/${endpoint}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const requestId = String(submitted.request_id ?? "");
  const statusUrl = String(submitted.status_url ?? "");
  const responseUrl = String(submitted.response_url ?? "");
  if (!requestId || !statusUrl || !responseUrl)
    throw new TemperError(`fal submit for ${endpoint} returned no queue receipt`, 502);

  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const status = await falJson(statusUrl, { method: "GET" });
    if (status.status === "COMPLETED") {
      const response = await falJson(responseUrl, { method: "GET" });
      const data = (response.data ?? response) as Record<string, unknown>;
      return { requestId, data };
    }
    if (status.status === "FAILED" || status.status === "ERROR")
      throw new TemperError(`fal ${endpoint} request ${requestId} failed`, 502);
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
  throw new TemperError(`fal ${endpoint} request ${requestId} timed out`, 504);
}

function firstImageUrl(result: FalResult): string {
  const images = result.data.images;
  if (!Array.isArray(images) || typeof images[0] !== "object" || images[0] === null)
    throw new TemperError(`fal request ${result.requestId} returned no image`, 502);
  const url = String((images[0] as Record<string, unknown>).url ?? "");
  if (!url.startsWith("https://"))
    throw new TemperError(`fal request ${result.requestId} returned an invalid image URL`, 502);
  return url;
}

async function lockGeneratedFile(id: Identity, fileId: string): Promise<void> {
  try {
    await temperAction(id, "Files", fileId, "Lock");
  } catch (error) {
    if (!(error instanceof TemperError) || error.status !== 409) throw error;
  }
  const row = await getEntity(id, "Files", fileId);
  if (row?.status !== "Locked")
    throw new TemperError(`Generated File('${fileId}') did not become Locked`, 502);
}

function sourcePrompt(item: ArtStyleMatrixCase): string {
  return [
    `Create ${sourceMediumDirection[item.source_medium]}.`,
    `Subject: ${item.subject}.`,
    `Composition: ${item.composition}.`,
    "This is a style-neutral image-edit test fixture.",
    "Do not imitate any artist or named style. Include no text, watermark, signature, border, or logo.",
  ].join(" ");
}

function editInput(
  endpoint: (typeof EDIT_ENDPOINTS)[number],
  prompt: string,
  sourceUrl: string,
): Record<string, unknown> {
  const shared = {
    prompt,
    image_urls: [sourceUrl],
    num_images: 1,
    output_format: "png",
  };
  if (endpoint === "openai/gpt-image-2/edit") {
    return {
      ...shared,
      image_size: "auto",
      quality: "high",
    };
  }
  return {
    ...shared,
    aspect_ratio: "auto",
    resolution: "1K",
    limit_generations: true,
  };
}

export type GeneratedArtStyleProof = {
  file_id: string;
  category: ArtStyleProofCategory;
  subject: string;
  composition: string;
  source_medium: ArtStyleSourceMedium;
  mode: "image_edit";
  seed: string;
  style_reference_used: false;
  model: { provider: "fal"; model: string };
  generation_receipt: ArtStyleGenerationReceipt;
};

export async function generateArtStyleProofMatrix(
  id: Identity,
  styleSlug: string,
  canonicalPrompt: string,
  cases: ArtStyleMatrixCase[],
): Promise<GeneratedArtStyleProof[]> {
  assertReceiptSafeText("style_slug", styleSlug);
  assertReceiptSafeText("prompt_template", canonicalPrompt);
  validateMatrix(cases);

  const sources = await Promise.all(
    cases.map(async (item, index) => {
      const prompt = sourcePrompt(item);
      const generated = await falQueueRun(SOURCE_ENDPOINT, {
        prompt,
        image_size: "square_hd",
        num_images: 1,
      });
      const image = await ingestImageWithDigest(
        id,
        firstImageUrl(generated),
        `${styleSlug}-source-${index + 1}`,
      );
      await lockGeneratedFile(id, image.fileId);
      return {
        item,
        fileId: image.fileId,
        sha256: image.sha256,
        endpoint: SOURCE_ENDPOINT,
        requestId: generated.requestId,
        promptSha256: sha256(prompt),
      };
    }),
  );

  const promptSha256 = sha256(canonicalPrompt);
  return Promise.all(
    EDIT_ENDPOINTS.flatMap((endpoint) =>
      sources.map(async (source, index) => {
        const generated = await falQueueRun(
          endpoint,
          editInput(
            endpoint,
            canonicalPrompt,
            `${config.galleryUrl}/api/file/${source.fileId}`,
          ),
        );
        const image = await ingestImageWithDigest(
          id,
          firstImageUrl(generated),
          `${styleSlug}-proof-${endpoint.includes("gpt-image") ? "gpt" : "nano"}-${index + 1}`,
        );
        await lockGeneratedFile(id, image.fileId);
        const seed = String(generated.data.seed ?? `request:${generated.requestId}`);
        const receipt = signReceipt({
          schema_version: "1",
          issuer: "katagami-mcp",
          kind: "art_style_proof",
          style_slug: styleSlug,
          category: source.item.category,
          subject: source.item.subject,
          composition: source.item.composition,
          source_medium: source.item.source_medium,
          source: {
            file_id: source.fileId,
            sha256: source.sha256,
            endpoint: source.endpoint,
            request_id: source.requestId,
            prompt_sha256: source.promptSha256,
          },
          output: {
            file_id: image.fileId,
            sha256: image.sha256,
            endpoint,
            request_id: generated.requestId,
            prompt_sha256: promptSha256,
            seed,
          },
        });
        return {
          file_id: image.fileId,
          category: source.item.category,
          subject: source.item.subject,
          composition: source.item.composition,
          source_medium: source.item.source_medium,
          mode: "image_edit",
          seed,
          style_reference_used: false,
          model: { provider: "fal", model: endpoint },
          generation_receipt: receipt,
        };
      }),
    ),
  );
}
