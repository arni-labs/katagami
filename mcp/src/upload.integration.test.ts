// Opt-in real-server regression: the authenticated import must remain visible
// through the gallery. A stored hash alone did not catch pathless File uploads.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.KATAGAMI_TEST_MCP_URL;
const gallery = process.env.KATAGAMI_TEST_GALLERY_URL;
const tokenFile = process.env.KATAGAMI_TEST_TOKEN_FILE;
const imageFile = process.env.KATAGAMI_TEST_IMAGE_FILE;

test("imported contributor image is locked, hashed, and served by the gallery", async () => {
  assert.ok(endpoint && gallery && tokenFile && imageFile,
    "Set KATAGAMI_TEST_MCP_URL, KATAGAMI_TEST_GALLERY_URL, KATAGAMI_TEST_TOKEN_FILE, and KATAGAMI_TEST_IMAGE_FILE");
  const bytes = await readFile(imageFile!);
  const token = (await readFile(tokenFile!, "utf8")).trim();
  const client = new Client({ name: "katagami-upload-regression", version: "1" });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint!), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  }));
  try {
    const result = await client.callTool({
      name: "import_art_style_proof_image",
      arguments: {
        label: `upload-regression-${Date.now()}`,
        mime_type: "image/png",
        image_base64: bytes.toString("base64"),
      },
    });
    assert.ok(!result.isError, JSON.stringify(result));
    const text = (result.content as Array<{ type: string; text?: string }>)
      .find((item) => item.type === "text")?.text;
    assert.ok(text, "import returned no record");
    const imported = JSON.parse(text) as { file_id: string; status: string; sha256: string };
    assert.equal(imported.status, "Locked");
    assert.equal(imported.sha256, createHash("sha256").update(bytes).digest("hex"));
    const response = await fetch(`${gallery}/api/file/${encodeURIComponent(imported.file_id)}`);
    assert.equal(response.status, 200, response.status === 200 ? "" : await response.text());
    assert.match(response.headers.get("content-type") ?? "", /^image\/png/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  } finally {
    await client.close();
  }
});
