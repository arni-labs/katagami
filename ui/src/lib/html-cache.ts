"use client";

/** Shared in-memory cache of embodiment HTML by fileId.
 *
 *  Each entry is the full (script-stripped) HTML text, fetched once per
 *  fileId per session. Reuse is trivial across many card mounts.
 */
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export async function fetchEmbodimentHtml(fileId: string): Promise<string> {
  const cached = cache.get(fileId);
  if (cached !== undefined) return cached;

  const existing = inflight.get(fileId);
  if (existing) return existing;

  const promise = (async () => {
    const url = `/api/file/${encodeURIComponent(fileId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fetch ${fileId}: ${res.status}`);
    const raw = await res.text();
    // Strip <script> tags — embodiments render into our origin via shadow DOM,
    // so we don't want their JS running with our page's privileges.
    const cleaned = raw.replace(/<script[\s\S]*?<\/script>/gi, "");
    cache.set(fileId, cleaned);
    inflight.delete(fileId);
    return cleaned;
  })();

  inflight.set(fileId, promise);
  return promise;
}
