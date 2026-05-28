import "server-only";

function cleanEnv(value: string | undefined, fallback: string): string {
  const cleaned = (value ?? fallback).replace(/\\n/g, "").trim();
  return cleaned || fallback;
}

const API_BASE = cleanEnv(
  process.env.NEXT_PUBLIC_TEMPER_API_URL,
  "http://localhost:3500",
);
const TENANT = cleanEnv(process.env.NEXT_PUBLIC_TEMPER_TENANT, "default");
const API_KEY = cleanEnv(process.env.TEMPER_API_KEY, "");

export async function readTemperFileBytes(
  fileId?: string,
): Promise<ArrayBuffer | null> {
  if (!fileId?.trim()) return null;

  const fetchHeaders: Record<string, string> = { "X-Tenant-Id": TENANT };
  if (API_KEY) fetchHeaders.Authorization = `Bearer ${API_KEY}`;

  const res = await fetch(`${API_BASE}/tdata/Files('${fileId}')/$value`, {
    headers: fetchHeaders,
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.arrayBuffer();
}

export async function readTemperFileText(
  fileId?: string,
): Promise<string | null> {
  const bytes = await readTemperFileBytes(fileId);
  if (!bytes) return null;
  return new TextDecoder().decode(bytes);
}
