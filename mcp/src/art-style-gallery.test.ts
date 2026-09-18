import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { artStyleGalleryImages, gallerySubmissionFields } from "./art-style-gallery.js";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const canonical = "Soft ink and dimensional faces.";
function fixture() {
  return Array.from({ length: 6 }, (_, i) => {
    const subject = `Scene ${i}`;
    const prompt = `${canonical}\n\nSubject and scene:\n${subject}`;
    return {
      file_id: `file-${i}`, subject,
      model: i < 4
        ? { provider: "OpenAI", model: `openai/gpt-image-2.5/${i % 2 ? "flare" : "sunburst"}/text-to-image` }
        : i === 4 ? { provider: "xAI", model: "xai/grok-imagine-image/v2.0/text-to-image" }
          : { provider: "Google", model: "fal-ai/nano-banana-pro" },
      generation_record: { schema_version: "1" as const, kind: "art_style_gallery" as const,
        style_slug: "morrow-ink", prompt, canonical_prompt_sha256: hash(canonical),
        output: { file_id: `file-${i}`, sha256: hash(`image-${i}`), prompt_sha256: hash(prompt), provider_request_id: `request-${i}` } },
    };
  });
}
function submit(images = fixture(), thumbnail = "file-0") {
  return gallerySubmissionFields(artStyleGalleryImages.parse(images), "morrow-ink", canonical, thumbnail);
}
test("six gallery images retain all files and complete records independently of proofs", () => {
  const result = submit();
  assert.deepEqual(result.reference_image_file_ids, fixture().map(i => i.file_id));
  assert.deepEqual(JSON.parse(result.reference_manifest), { schema_version: "2", items: fixture() });
});
test("exact count, model identities, strict records, and required request IDs", () => {
  assert.throws(() => submit(fixture().slice(0, 5)));
  for (const mutate of [
    (a: ReturnType<typeof fixture>) => { a[0].model = a[4].model; },
    (a: ReturnType<typeof fixture>) => { a[0].model.provider = "Unknown"; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.output.provider_request_id = ""; },
    (a: ReturnType<typeof fixture>) => { a[0].generation_record.output.sha256 = "A".repeat(64); },
    (a: ReturnType<typeof fixture>) => { Object.assign(a[0], { unexpected: true }); },
  ]) { const a = fixture(); mutate(a); assert.throws(() => submit(a)); }
});
test("reject duplicate files or bytes, inconsistent prompt bindings and non-first thumbnails", () => {
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

test("MCP submit forwards the six-image manifest and keeps the two-model proof separate", async (t) => {
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
      source_medium: "documentary photograph", mode: "image_edit", style_reference_used: false,
      model: { provider: `provider-${i}`, model: `edit-model-${i}` },
      generation_record: { schema_version: "1", kind: "art_style_proof", style_slug: "morrow-ink",
        source: { file_id: "source", sha256: hash("source") },
        output: { file_id: `proof-${i}`, sha256: hash(`proof-${i}`), prompt_sha256: hash(canonical) } },
    }));
    const args = { entity_id: "draft", name: "Morrow Ink", slug: "morrow-ink", medium: "illustration",
      prompt_template: canonical, slot_recipes: {}, gallery_images: fixture(), proof_shots: proofs,
      thumbnail_file_id: "file-0", source_basis: {}, prompt_review: {}, portability_report: {},
      model_provenance: { style: { model: "author", provider: "test" }, source: { model: "source", provider: "test" }, images: proofs.map(p => p.model) },
      credits: [{ name: "Comic traditions", kind: "tradition" }],
    };
    const invalid = await client.callTool({ name: "submit_art_style", arguments: { ...args, thumbnail_file_id: "proof-0" } });
    assert.equal(invalid.isError, true);
    assert.equal(Boolean(submitted), false, "invalid gallery must not mutate a draft");
    const result = await client.callTool({ name: "submit_art_style", arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.deepEqual(submitted?.reference_image_file_ids, fixture().map(i => i.file_id));
    assert.deepEqual(JSON.parse(String(submitted?.reference_manifest)), { schema_version: "2", items: fixture() });
    assert.deepEqual(submitted?.proof_shots_file_ids, ["proof-0", "proof-1"]);
    assert.deepEqual(JSON.parse(String(submitted?.proof_shots_manifest)), { schema_version: "3", items: proofs });
    assert.equal(submitted?.thumbnail_file_id, "file-0");
  } finally {
    await client.close();
    await server.close();
  }
});
