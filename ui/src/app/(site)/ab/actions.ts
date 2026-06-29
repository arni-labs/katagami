"use server";

import { assertOwner } from "@/lib/owner";

// Durable storage for owner A/B verdicts. Appends JSONL to a single Files entity
// in the `katagami-contrib` workspace at /feedback/ab-verdicts.jsonl.
//
// How the Temper FS write works (verified against the deployed backend):
//   1. POST Workspaces('katagami-contrib')/Paw.FS.CreateFile {path, mime_type}
//      — a path-idempotent `creat`: returns the SAME file id for a given path
//      and does NOT truncate existing content. The created file id comes back
//      as `fields.last_file_id`. (The workspace state also carries cosmetic
//      `error_message`/`last_file_path` diagnostics from a path-listing budget
//      cap — they don't affect last_file_id, so we ignore them.)
//   2. GET  Files('<id>')/$value — the existing accumulated JSONL (404 = first
//      write, treated as empty).
//   3. PUT  Files('<id>')/$value — the existing content + the new lines.
//
// So append = create-or-resolve, read, concatenate, put-back.
function cleanEnv(value: string | undefined, fallback: string): string {
  return (value ?? fallback).replace(/\\n/g, "").trim() || fallback;
}

const API_BASE = cleanEnv(
  process.env.NEXT_PUBLIC_TEMPER_API_URL,
  "http://localhost:3500",
);
const TENANT = cleanEnv(process.env.NEXT_PUBLIC_TEMPER_TENANT, "default");
const API_KEY = cleanEnv(process.env.TEMPER_API_KEY, "");

const WORKSPACE = "katagami-contrib";
const VERDICTS_PATH = "/feedback/ab-verdicts.jsonl";
const VERDICTS_MIME = "application/x-ndjson";

const authedHeaders: Record<string, string> = {
  "X-Tenant-Id": TENANT,
  // Writes are made by the app acting as an agent principal.
  "x-temper-principal-kind": "agent",
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
};

export type AbWinner = "A" | "B" | "tie";

export interface AbRecord {
  type: "pairwise";
  ts: string;
  name: string;
  surface: string;
  winner: AbWinner;
  chosen_id: string;
  rejected_id: string;
  dimension: string;
  note: string;
  rulebook_version: string;
  revision_run: string;
}

export interface RecordAbResult {
  ok: boolean;
  count?: number;
  error?: string;
}

/** Create-or-resolve the verdicts file and return its canonical file id. */
async function resolveVerdictsFileId(): Promise<string> {
  const res = await fetch(
    `${API_BASE}/tdata/Workspaces('${WORKSPACE}')/Paw.FS.CreateFile`,
    {
      method: "POST",
      headers: { ...authedHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ path: VERDICTS_PATH, mime_type: VERDICTS_MIME }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`CreateFile ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as {
    fields?: { last_file_id?: string };
  };
  const fileId = body.fields?.last_file_id;
  if (!fileId) {
    throw new Error("CreateFile did not return a file id.");
  }
  return fileId;
}

/** The current JSONL contents of the verdicts file ("" if it has none yet). */
async function readVerdicts(fileId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/tdata/Files('${fileId}')/$value`, {
    headers: authedHeaders,
    cache: "no-store",
  });
  if (res.status === 404) return "";
  if (!res.ok) {
    throw new Error(`Read $value ${res.status}: ${await res.text()}`);
  }
  return res.text();
}

async function writeVerdicts(fileId: string, content: string): Promise<void> {
  const res = await fetch(`${API_BASE}/tdata/Files('${fileId}')/$value`, {
    method: "PUT",
    headers: { ...authedHeaders, "Content-Type": VERDICTS_MIME },
    body: content,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Write $value ${res.status}: ${await res.text()}`);
  }
}

export async function recordAbFeedback(
  records: AbRecord[],
): Promise<RecordAbResult> {
  await assertOwner();

  if (!Array.isArray(records) || records.length === 0) {
    return { ok: true, count: 0 };
  }

  const lines = records.map((r) => JSON.stringify(r)).join("\n") + "\n";

  try {
    const fileId = await resolveVerdictsFileId();
    const existing = await readVerdicts(fileId);
    // A whitespace-only file (empty, or the single-newline "cleared" state the
    // backend keeps because it rejects a zero-length $value) is treated as no
    // prior content, so we never prepend a blank line. Otherwise keep the file
    // newline-terminated so each PUT is a clean append.
    const hasContent = existing.trim().length > 0;
    const prefix = !hasContent
      ? ""
      : existing.endsWith("\n")
        ? existing
        : existing + "\n";
    await writeVerdicts(fileId, prefix + lines);
    return { ok: true, count: records.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
