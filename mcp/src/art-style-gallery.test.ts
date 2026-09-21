import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { artStyleGalleryImages, gallerySubmissionFields } from "./art-style-gallery.js";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const canonical = "Soft ink and dimensional faces.";
function fixture() {
  return Array.from({ length: 5 }, (_, i) => {
    const subject = `Scene ${i}`;
    const prompt = `${canonical}\n\nSubject and scene:\n${subject}`;
    return {
      file_id: `file-${i}`, subject,
      model: i < 4
        ? { provider: "OpenAI", model: `openai/gpt-image-2.5/${i % 2 ? "flare" : "sunburst"}/text-to-image` as string | null }
        : { provider: "xAI", model: "xai/grok-imagine-image/v2.0/text-to-image" },
      generation_record: { schema_version: "2" as const, kind: "art_style_gallery" as const,
        style_slug: "morrow-ink", prompt, canonical_prompt_sha256: hash(canonical),
        mode: "text_to_image" as const, input_image_file_ids: [] as string[],
        execution: { route: "provider", harness: "codex", tool: "fal",
          receipt: `request-${i}`, requested_model: i < 4 ? "GPT Image 2.5" : "Grok Image",
          provider_request_id: `request-${i}` as string | null },
        output: { file_id: `file-${i}`, sha256: hash(`image-${i}`), prompt_sha256: hash(prompt) } },
    };
  });
}
function submit(images = fixture(), thumbnail = "file-0") {
  return gallerySubmissionFields(artStyleGalleryImages.parse(images), "morrow-ink", canonical, thumbnail);
}
test("five gallery images retain all files and complete records independently of proofs", () => {
  const result = submit();
  assert.deepEqual(result.reference_image_file_ids, fixture().map(i => i.file_id));
  assert.deepEqual(JSON.parse(result.reference_manifest), { schema_version: "3", items: fixture() });
});
test("required count and mix, strict records, and required request IDs", () => {
  for (const count of [0, 1, 4]) assert.throws(() => submit(fixture().slice(0, count)));
  assert.throws(() => submit([...fixture(), fixture()[0]]));
  for (const mutate of [
    (a: ReturnType<typeof fixture>) => { a[0].model.provider = ""; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.execution.provider_request_id = ""; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.output.sha256 = "A".repeat(64); },
    (a: ReturnType<typeof fixture>) => { Object.assign(a[0], { unexpected: true }); },
  ]) { const a = fixture(); mutate(a); assert.throws(() => submit(a)); }
});
test("reject duplicate files or bytes, inconsistent prompt bindings and unknown thumbnails", () => {
  for (const mutate of [
    (a: ReturnType<typeof fixture>) => { a[1].file_id = a[0].file_id; },
    (a: ReturnType<typeof fixture>) => { a[1].generation_record.output.sha256 = a[0].generation_record.output.sha256; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.output.file_id = "wrong"; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.style_slug = "other"; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.prompt += " changed"; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.canonical_prompt_sha256 = hash("wrong"); },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.output.prompt_sha256 = hash("wrong"); },
  ]) { const a = fixture(); mutate(a); assert.throws(() => submit(a)); }
  assert.throws(() => submit(fixture(), "file-1"));
  assert.throws(() => submit(fixture(), "proof-file"));
});

test("MCP submit forwards the five-image manifest and keeps the two-model proof separate", async (t) => {
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
  const { buildServer } = await import("./tools.js");
  let submitted: Record<string, unknown> | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    if (init?.method === "POST") {
      submitted = JSON.parse(String(init.body));
      return Response.json({});
    }
    return Response.json({ entity_id: "draft", status: "Draft", fields: {
      creator_sub: "owner", verification_job_id: submitted ? "job-new" : "job-old",
    } });
  });
  const server = buildServer({ token: "test-only", clientId: "agent", scopes: [], extra: { sub: "owner" } });
  const client = new Client({ name: "gallery-test", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  await client.connect(b);
  try {
    const proofs = [0, 1].map(i => ({
      file_id: `proof-${i}`, category: "human_portrait", subject: "person", composition: "portrait",
      mode: "text_to_image", style_reference_used: false,
      model: { provider: `provider-${i}`, model: `image-model-${i}` },
      generation_record: { schema_version: "2", kind: "art_style_proof", style_slug: "morrow-ink",
        mode: "text_to_image", input_image_file_ids: [],
        prompt: `${canonical}\n\nSubject and scene:\nperson`, canonical_prompt_sha256: hash(canonical),
        execution: { route: "provider", harness: "codex", tool: "provider.generate", receipt: `proof-request-${i}`,
          requested_model: `image-model-${i}`, provider_request_id: `proof-request-${i}` },
        output: { file_id: `proof-${i}`, sha256: hash(`proof-${i}`), prompt_sha256: hash(`${canonical}\n\nSubject and scene:\nperson`) } },
    }));
    const args = { entity_id: "draft", name: "Morrow Ink", slug: "morrow-ink", medium: "illustration",
      prompt_template: canonical, slot_recipes: {}, gallery_images: fixture(), proof_shots: proofs,
      thumbnail_file_id: "file-0", source_basis: {}, prompt_review: {}, portability_report: {},
      model_provenance: { style: { model: "author", provider: "test" }, source: { model: "source", provider: "test" }, images: proofs.map(p => p.model) },
      credits: [{ name: "Comic traditions", kind: "tradition" }],
    };
    const invalid = await client.callTool({ name: "submit_art_style", arguments: { ...args, thumbnail_file_id: "missing" } });
    assert.equal(invalid.isError, true);
    assert.equal(Boolean(submitted), false, "invalid gallery must not mutate a draft");
    const result = await client.callTool({ name: "submit_art_style", arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.deepEqual(submitted?.reference_image_file_ids, fixture().map(i => i.file_id));
    assert.deepEqual(JSON.parse(String(submitted?.reference_manifest)), { schema_version: "3", items: fixture() });
    assert.deepEqual(submitted?.proof_shots_file_ids, ["proof-0", "proof-1"]);
    assert.deepEqual(JSON.parse(String(submitted?.proof_shots_manifest)), { schema_version: "4", items: proofs });
    assert.equal(submitted?.thumbnail_file_id, "file-0");
    const { gallery_images, thumbnail_file_id, ...minimal } = args;
    submitted = undefined;
    const minimalResult = await client.callTool({ name: "submit_art_style", arguments: minimal });
    assert.equal(minimalResult.isError, true);
    assert.equal(submitted, undefined, "missing gallery must not mutate a draft");
    const inputImageProofs = proofs.map((proof, i) => i === 0 ? {
      ...proof, generation_record: { ...proof.generation_record, input_image_file_ids: ["source-image"] },
    } : proof);
    submitted = undefined;
    const inputImageResult = await client.callTool({ name: "submit_art_style", arguments: { ...args, proof_shots: inputImageProofs } });
    assert.equal(inputImageResult.isError, true);
    assert.equal(submitted, undefined, "image transforms must not mutate a draft");
    const builtinProofs = proofs.map((proof, i) => i === 0 ? {
      ...proof, model: { provider: "OpenAI", model: null },
      generation_record: { ...proof.generation_record, execution: {
        route: "builtin", harness: "codex", tool: "image_gen.imagegen", receipt: "actual-tool-receipt",
        requested_model: "GPT Image 2.5", provider_request_id: null,
      } },
    } : proof);
    const builtinResult = await client.callTool({ name: "submit_art_style", arguments: {
      ...args, proof_shots: builtinProofs,
      model_provenance: { style: args.model_provenance.style, images: builtinProofs.map(proof => proof.model) },
    } });
    assert.ok(!builtinResult.isError, JSON.stringify(builtinResult));

  } finally {
    await client.close();
    await server.close();
  }
});


test("built-in tools preserve unknown model versions without invented request IDs", () => {
  const images = fixture();
  images[0].model.model = null;
  images[0].generation_record.execution.route = "builtin";
  images[0].generation_record.execution.tool = "image_gen.imagegen";
  images[0].generation_record.execution.provider_request_id = null;
  const result = submit(images);
  assert.equal(JSON.parse(result.reference_manifest).items[0].model.model, null);
  images[0].generation_record.execution.harness = "claude";
  assert.throws(() => submit(images), "Claude must record the invoked Codex harness, not claim a native tool");
});

test("prompt-only gallery rejects inputs, missing receipts and invented provider metadata", () => {
  for (const mutate of [
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.input_image_file_ids = ["source-image"]; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.execution.receipt = ""; },
    (a: ReturnType<typeof fixture>) => { a[0].model.model = null; },

  ]) { const a = fixture(); mutate(a); assert.throws(() => submit(a)); }
});

test("gallery requires four OpenAI and one xAI, strongest first as thumbnail", () => {
  const images = fixture();
  images[4].model.provider = "Google";
  assert.throws(() => submit(images));
  assert.throws(() => gallerySubmissionFields([], "morrow-ink", canonical, "proof-0", ["proof-0"]));
  const reordered = fixture();
  reordered.unshift(reordered.pop()!);
  assert.equal(submit(reordered, "file-4").reference_image_file_ids[0], "file-4");
});
