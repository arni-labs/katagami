#!/usr/bin/env node
// katagami — contribute to the Katagami design commons from a terminal.
//
// A thin client over the Katagami MCP server (mcp.katagami.ai): one set of
// tools, one validation path, whether you arrive via an agent harness or
// this CLI. Auth is the same OAuth flow agents use — `katagami login` opens
// the consent screen; a headless refresh token from the Agents & access
// page works via KATAGAMI_REFRESH_TOKEN.

import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

const DEFAULT_SERVER = process.env.KATAGAMI_MCP_URL ?? "https://mcp.katagami.ai";
const CONFIG_DIR = join(homedir(), ".config", "katagami");
const CRED_PATH = join(CONFIG_DIR, "credentials.json");

type Credentials = {
  server: string;
  issuer: string;
  client_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function die(msg: string): never {
  console.error(`katagami: ${msg}`);
  process.exit(1);
}

function loadCreds(): Credentials | null {
  try {
    return JSON.parse(readFileSync(CRED_PATH, "utf8")) as Credentials;
  } catch {
    return null;
  }
}

function saveCreds(c: Credentials): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CRED_PATH, JSON.stringify(c, null, 2), { mode: 0o600 });
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${url} returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(
      `${url} failed (${res.status}): ${String(body.error_description ?? body.error ?? text.slice(0, 200))}`,
    );
  }
  return body;
}

/** Discover the AS from the MCP server's protected-resource metadata. */
async function discover(server: string): Promise<{ issuer: string; authz: string; token: string; register: string }> {
  const prm = await fetchJson(`${server}/.well-known/oauth-protected-resource`);
  const issuer = (prm.authorization_servers as string[] | undefined)?.[0];
  if (!issuer) die("The MCP server did not advertise an authorization server.");
  const meta = await fetchJson(`${issuer.replace(/\/$/, "")}/.well-known/oauth-authorization-server`);
  return {
    issuer: String(meta.issuer),
    authz: String(meta.authorization_endpoint),
    token: String(meta.token_endpoint),
    register: String(meta.registration_endpoint),
  };
}

function openBrowser(url: string): void {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
  } catch {
    /* the printed URL is the fallback */
  }
}

async function login(server: string): Promise<void> {
  const as = await discover(server);

  const reg = await fetchJson(as.register, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "katagami CLI",
      redirect_uris: ["http://127.0.0.1:8976/callback"],
    }),
  });
  const clientId = String(reg.client_id);

  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(16));

  const code = await new Promise<string>((resolve, reject) => {
    const srv = createServer((req, res) => {
      const u = new URL(req.url ?? "/", "http://127.0.0.1:8976");
      if (u.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<body style='font-family:system-ui;padding:3rem'>Signed in — you can close this tab and return to the terminal.</body>");
      srv.close();
      if (u.searchParams.get("state") !== state) reject(new Error("state mismatch"));
      else if (u.searchParams.get("error")) reject(new Error(String(u.searchParams.get("error"))));
      else resolve(String(u.searchParams.get("code")));
    });
    srv.on("error", (e) => reject(e));
    srv.listen(8976, "127.0.0.1", () => {
      const p = new URLSearchParams({
        client_id: clientId,
        redirect_uri: "http://127.0.0.1:8976/callback",
        response_type: "code",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        scope: "contribute",
        resource: server,
      });
      const url = `${as.authz}?${p.toString()}`;
      console.log("Opening the Katagami consent screen (approve there, then return here):\n\n  " + url + "\n");
      openBrowser(url);
    });
    setTimeout(() => {
      srv.close();
      reject(new Error("timed out waiting for the browser consent (5 minutes)"));
    }, 300_000).unref();
  });

  const tok = await fetchJson(as.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: clientId,
      redirect_uri: "http://127.0.0.1:8976/callback",
    }).toString(),
  });
  saveCreds({
    server,
    issuer: as.issuer,
    client_id: clientId,
    access_token: String(tok.access_token),
    refresh_token: String(tok.refresh_token),
    expires_at: Date.now() + Number(tok.expires_in ?? 900) * 1000,
  });
  console.log(`Signed in. Credentials stored in ${CRED_PATH}.`);
}

async function accessToken(server: string): Promise<string> {
  // Headless path: a pre-authorized refresh token from /account/agents.
  const envRefresh = process.env.KATAGAMI_REFRESH_TOKEN;
  let creds = loadCreds();
  if (!creds && envRefresh) {
    const as = await discover(server);
    creds = {
      server,
      issuer: as.issuer,
      client_id: "",
      access_token: "",
      refresh_token: envRefresh,
      expires_at: 0,
    };
  }
  if (!creds) die("Not signed in. Run `katagami login` (or set KATAGAMI_REFRESH_TOKEN).");
  if (creds.access_token && Date.now() < creds.expires_at - 30_000) return creds.access_token;

  const as = await discover(creds.server);
  const tok = await fetchJson(as.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: creds.refresh_token,
      ...(creds.client_id ? { client_id: creds.client_id } : {}),
      resource: creds.server,
    }).toString(),
  });
  const next: Credentials = {
    ...creds,
    access_token: String(tok.access_token),
    refresh_token: String(tok.refresh_token ?? creds.refresh_token),
    expires_at: Date.now() + Number(tok.expires_in ?? 900) * 1000,
  };
  saveCreds(next);
  return next.access_token;
}

let rpcId = 0;
async function callTool(server: string, name: string, args: Record<string, unknown>): Promise<string> {
  const token = await accessToken(server);
  const res = await fetch(`${server}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: ++rpcId,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const raw = await res.text();
  if (!res.ok) die(`MCP call failed (${res.status}): ${raw.slice(0, 300)}`);
  const dataLine = raw.split("\n").find((l) => l.startsWith("data:"));
  const body = JSON.parse(dataLine ? dataLine.slice(5) : raw) as {
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
    error?: { message?: string };
  };
  if (body.error) die(body.error.message ?? "MCP error");
  const text = body.result?.content?.[0]?.text ?? "";
  if (body.result?.isError) die(text);
  return text;
}

function usage(): never {
  console.log(`katagami — contribute to the Katagami design commons

Usage:
  katagami login [--server URL]        Sign in with Google via the consent screen
  katagami logout                      Forget stored credentials
  katagami whoami                      Show the human + agent identities
  katagami search <kind> [query]       Search published styles
  katagami pull <kind> <id>            Fetch one style's full spec
  katagami remix <kind> <parent-id> --name NAME --slug SLUG [--lineage evolution|remix]
  katagami submit <kind> --file payload.json [--id DRAFT_ID]
  katagami status <kind> <id>          Lifecycle + review status

Kinds: language | palette | art_style
Submissions always land UnderReview, attributed to your account; curators publish.
Headless (CI): set KATAGAMI_REFRESH_TOKEN from katagami.ai/account/agents.`);
  process.exit(0);
}

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const SUBMIT_TOOLS: Record<string, string> = {
  language: "submit_design_language",
  palette: "submit_palette_system",
  art_style: "submit_art_style",
};

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  const server = (flag(rest, "server") ?? DEFAULT_SERVER).replace(/\/$/, "");

  switch (cmd) {
    case "login":
      await login(server);
      return;
    case "logout":
      rmSync(CRED_PATH, { force: true });
      console.log("Signed out.");
      return;
    case "whoami":
      console.log(await callTool(server, "whoami", {}));
      return;
    case "search": {
      const [kind, ...q] = rest.filter((a) => !a.startsWith("--"));
      if (!kind) usage();
      console.log(await callTool(server, "search_styles", { kind, query: q.join(" ") || undefined }));
      return;
    }
    case "pull": {
      const [kind, id] = rest.filter((a) => !a.startsWith("--"));
      if (!kind || !id) usage();
      console.log(await callTool(server, "get_style", { kind, id }));
      return;
    }
    case "remix": {
      const [kind, parent] = rest.filter((a) => !a.startsWith("--"));
      const name = flag(rest, "name");
      const slug = flag(rest, "slug");
      if (!kind || !parent || !name || !slug) usage();
      console.log(
        await callTool(server, "remix", {
          kind,
          parent_id: parent,
          name,
          slug,
          lineage_type: flag(rest, "lineage"),
        }),
      );
      return;
    }
    case "submit": {
      const [kind] = rest.filter((a) => !a.startsWith("--"));
      const file = flag(rest, "file");
      const tool = kind ? SUBMIT_TOOLS[kind] : undefined;
      if (!tool || !file) usage();
      const payload = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
      const draftId = flag(rest, "id");
      if (draftId) payload.entity_id = draftId;
      console.log(await callTool(server, tool, payload));
      return;
    }
    case "status": {
      const [kind, id] = rest.filter((a) => !a.startsWith("--"));
      if (!kind || !id) usage();
      console.log(await callTool(server, "submission_status", { kind, id }));
      return;
    }
    default:
      usage();
  }
}

main().catch((err: unknown) => die(err instanceof Error ? err.message : String(err)));
