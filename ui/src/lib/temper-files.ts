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

  // File ids are immutable (a re-export gets a new id), so the content for a
  // given id never changes — cache it. The language detail page reads several
  // of these per request (shadcn export / component spec / preview shots); with
  // no-store every load + reload re-fetched them all from Temper.
  const res = await fetch(`${API_BASE}/tdata/Files('${fileId}')/$value`, {
    headers: fetchHeaders,
    next: { revalidate: 300 },
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
