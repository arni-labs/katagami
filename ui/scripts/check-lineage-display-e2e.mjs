import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const childId = "en-019e0af5-0d06-7fd1-a21c-ab36e45553b3";
const parentId = "en-019d9bba-3cb4-7072-ab23-7914ed75c93e";

const child = {
  Id: childId,
  Status: "Published",
  Name: "Jelly Dew Story UI",
  Slug: "jelly-dew-story-ui",
  LineageType: "evolution",
  GenerationNumber: 1,
  ParentIds: JSON.stringify([parentId]),
};

const parent = {
  Id: parentId,
  Status: "Published",
  Name: "WhimsiCollage Storybook",
  Slug: "whimsi-collage-storybook",
  LineageType: "original",
  GenerationNumber: 0,
  ParentIds: "[]",
  ForkCount: 1,
};

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function startMockOData() {
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    requests.push(`${req.method} ${url.pathname}${url.search}`);

    if (url.pathname === "/tdata/DesignLanguages") {
      json(res, 200, { value: [child, parent] });
      return;
    }
    if (url.pathname === `/tdata/DesignLanguages('${childId}')`) {
      json(res, 200, child);
      return;
    }
    if (url.pathname === `/tdata/DesignLanguages('${parentId}')`) {
      json(res, 200, parent);
      return;
    }

    json(res, 404, { error: `unexpected mock OData path: ${url.pathname}` });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object");
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        requests,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

function reservePort() {
  const server = net.createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      assert(address && typeof address === "object");
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

function startNext({ port, apiBase }) {
  const bin = path.join(root, "node_modules", ".bin", "next");
  const logs = [];
  const proc = spawn(bin, ["dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    env: {
      ...process.env,
      NEXT_PUBLIC_TEMPER_API_URL: apiBase,
      NEXT_PUBLIC_TEMPER_TENANT: "default",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.on("data", (chunk) => logs.push(String(chunk)));
  proc.stderr.on("data", (chunk) => logs.push(String(chunk)));

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    logs,
    stop: () =>
      new Promise((resolve) => {
        if (proc.exitCode !== null || proc.signalCode !== null) {
          resolve();
          return;
        }
        proc.once("exit", resolve);
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (proc.exitCode === null && proc.signalCode === null) proc.kill("SIGKILL");
        }, 2000).unref();
      }),
  };
}

async function waitForRoute(baseUrl, route, logs) {
  const deadline = Date.now() + 30000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}${route}`);
      const body = await res.text();
      if (res.ok) return body;
      lastError = new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Next route did not become ready: ${String(lastError)}\n${logs.join("")}`,
  );
}

function pageText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let odata;
let next;
try {
  odata = await startMockOData();
  const nextPort = await reservePort();
  next = startNext({ port: nextPort, apiBase: odata.baseUrl });

  const languageHtml = await waitForRoute(
    next.baseUrl,
    `/language/${childId}`,
    next.logs,
  );
  const languageText = pageText(languageHtml);
  assert.match(languageText, /Jelly Dew Story UI/);
  assert.match(languageText, /evolution/);
  assert.match(languageText, /gen 01/);
  assert.match(languageText, /WhimsiCollage Storybook/);

  const lineageHtml = await waitForRoute(
    next.baseUrl,
    `/lineage?root=${childId}`,
    next.logs,
  );
  const lineageText = pageText(lineageHtml);
  assert.match(lineageText, /1 evolution/);
  assert.match(lineageText, /gen 01/);
  assert.match(lineageText, /first evolutions/);
  assert.match(lineageText, /Jelly Dew Story UI/);
  assert.match(lineageText, /WhimsiCollage Storybook/);

  assert(
    odata.requests.some((request) => request.includes(`DesignLanguages('${childId}')`)),
    `child OData request missing: ${odata.requests.join(", ")}`,
  );
  assert(
    odata.requests.some((request) => request.includes(`DesignLanguages('${parentId}')`)),
    `parent OData request missing: ${odata.requests.join(", ")}`,
  );

  console.log("E2E lineage display check passed for evolution child and parent link");
} finally {
  await next?.stop();
  await odata?.close();
}
