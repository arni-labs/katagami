import "server-only";

// A floor under abuse for routes that spend a paid model call per request: one
// address may only start so many a minute. Per server instance, so it is not a
// wall — it makes a casual loop expensive to run, not impossible.
const WINDOW_MS = 60_000;
const PER_WINDOW = { sample: 6, full: 30 } as const;
const starts = new Map<string, number[]>();

export function callerOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function mayStart(scope: string, who: string, tier: "sample" | "full"): boolean {
  const key = `${scope}:${who}`;
  const now = Date.now();
  const mine = (starts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (mine.length >= PER_WINDOW[tier]) {
    starts.set(key, mine);
    return false;
  }
  mine.push(now);
  if (starts.size >= 5_000) starts.clear();
  starts.set(key, mine);
  return true;
}

export const TOO_MANY = "that is a lot of requests in a minute — give it a moment and try again";
