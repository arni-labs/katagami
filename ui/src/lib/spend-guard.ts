import "server-only";

// A floor under abuse for routes that spend a paid model call per request: one
// address may only start so many a minute. Per server instance, so it is not a
// wall — it makes a casual loop expensive to run, not impossible.
//
// Signed-out callers were held to 6 a minute per address. An assistant such as
// Muse calls connectors from shared servers, so all of its signed-out users
// would have shared those 6. An address now gets as many as a signed-in person
// (30), and all signed-out traffic on an instance shares a ceiling (240), which
// still bounds what an open door can spend.
const WINDOW_MS = 60_000;
const PER_WINDOW = { sample: 30, full: 30 } as const;
const SAMPLE_CEILING = 240;
const starts = new Map<string, number[]>();
let sampleStarts: number[] = [];

export function callerOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function mayStart(scope: string, who: string, tier: "sample" | "full"): boolean {
  const key = `${scope}:${who}`;
  const now = Date.now();
  if (tier === "sample") {
    sampleStarts = sampleStarts.filter((at) => now - at < WINDOW_MS);
    if (sampleStarts.length >= SAMPLE_CEILING) return false;
  }
  const mine = (starts.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (mine.length >= PER_WINDOW[tier]) {
    starts.set(key, mine);
    return false;
  }
  mine.push(now);
  if (tier === "sample") sampleStarts.push(now);
  if (starts.size >= 5_000) starts.clear();
  starts.set(key, mine);
  return true;
}

export const TOO_MANY = "that is a lot of requests in a minute — give it a moment and try again";
