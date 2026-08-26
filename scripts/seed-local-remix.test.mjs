// Prove seed-local-remix.mjs does not die on the first SubmitForReview 409.
// Stands up a mock Temper OData and runs the real seed script against it.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedScript = path.join(root, "scripts", "seed-local-remix.mjs");

const created = { Files: 0, ArtStyles: 0, DesignLanguages: 0, PaletteSystems: 0 };
const submitAttempts = [];
let ids = 0;

function send(res, status, body) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(payload);
}

const server = createServer((req, res) => {
  const url = req.url || "";
  if (req.method === "GET" && url.startsWith("/tdata/PaletteSystems") && !url.includes("Temper.")) {
    return send(res, 200, { value: [] });
  }
  if (req.method === "GET" && url.includes("$filter=Status")) {
    return send(res, 200, { value: [] });
  }
  if (req.method === "POST" && url === "/tdata/Files") {
    created.Files += 1;
    return send(res, 201, { entity_id: `file-${created.Files}` });
  }
  if (req.method === "POST" && /\/tdata\/Files\([^)]+\)\/Temper\.StreamUpdated/.test(url)) {
    return send(res, 200, {});
  }
  const createMatch = url.match(/^\/tdata\/(ArtStyles|DesignLanguages|PaletteSystems)$/);
  if (req.method === "POST" && createMatch) {
    created[createMatch[1]] += 1;
    ids += 1;
    return send(res, 201, { entity_id: `${createMatch[1]}-${ids}` });
  }
  const actMatch = url.match(/\/tdata\/(ArtStyles|DesignLanguages|PaletteSystems)\('([^']+)'\)\/Temper\.([^/?]+)/);
  if (req.method === "POST" && actMatch) {
    const [, set, id, action] = actMatch;
    if (action === "SubmitForReview") {
      submitAttempts.push(`${set}:${id}`);
      return send(
        res,
        409,
        "ActionFailed: Action 'SubmitForReview' not valid from state 'Draft'",
      );
    }
    return send(res, 200, {});
  }
  send(res, 404, { error: `unhandled ${req.method} ${url}` });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();

const child = spawn(process.execPath, [seedScript], {
  env: {
    ...process.env,
    TEMPER_URL: `http://127.0.0.1:${port}`,
    TENANT: "default",
    KEY: "test-local-key",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let out = "";
child.stdout.on("data", (b) => { out += b.toString(); });
child.stderr.on("data", (b) => { out += b.toString(); });

const code = await new Promise((resolve) => child.on("close", resolve));
server.close();

const fail = (msg) => {
  console.error("FAIL:", msg);
  console.error(out);
  process.exit(1);
};

if (code === 1) fail(`seed exited 1 on the recorded 409 (got ${code})`);
if (!/Seed incomplete: SubmitForReview refused from Draft/.test(out)) {
  fail("missing honest incomplete marker");
}
if (/=== Seed complete ===/.test(out)) fail("must not claim Seed complete after the 409");
if (created.ArtStyles < 3) fail(`expected 3 ArtStyles, got ${created.ArtStyles}`);
if (created.DesignLanguages < 2) fail(`expected 2 DesignLanguages, got ${created.DesignLanguages}`);
if (created.PaletteSystems < 3) fail(`expected 3 PaletteSystems, got ${created.PaletteSystems}`);
if (submitAttempts.length < 8) {
  fail(`expected SubmitForReview on every lane entity, got ${submitAttempts.length}`);
}
if (out.includes("SEED FAILED") && !out.includes("left in Draft")) {
  fail("act() still aborted the process on the first 409");
}

console.log("ok  seed continues past first SubmitForReview 409");
console.log(`ok  created ${created.ArtStyles} art / ${created.DesignLanguages} lang / ${created.PaletteSystems} pal`);
console.log(`ok  ${submitAttempts.length} SubmitForReview attempts, exit ${code}`);
console.log("ALL PASSED");
