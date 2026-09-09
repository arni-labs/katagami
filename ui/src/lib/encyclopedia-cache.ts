import "server-only";

import { unstable_cache } from "next/cache";
import { loadEncyclopedia, type EncyclopediaGraph } from "@/lib/encyclopedia";
import { heldRead } from "@/lib/held-read";

// Reading the encyclopedia costs seconds: every attested cell, then every
// record those cells name as a manifestation, over the network. The page is
// dynamic because it is owner-gated, but the answer does not depend on who is
// asking — every owner sees the same library — so paying for that read once
// per request was paying for it once per reader.
//
// So it is held for a minute and shared, and callers arriving during a read
// wait on that read rather than starting their own.

// How to check that a drop actually drops, in about two minutes. Anything that
// changes this file should be checked this way before it is called done:
//
//   1. `npm run build && npm start` — a dev server rebuilds modules on its own
//      and will hide a cache that never dropped.
//   2. Add one line to `loadEncyclopedia` that prints when the backend is read.
//   3. Load a page that renders cells, POST the revalidate endpoint, load again.
//   4. The line prints a second time, or the drop did not reach the render.
//
// Do this on more than one path. A drop scoped to the render that read it works
// on `/encyclopedia` and nowhere else, while reporting success everywhere.
//
// Timing cannot answer this question. After a failed drop the page returned in
// 0.08s — a cheap rebuild over warm OData caches underneath, which is
// indistinguishable from a cache hit from outside. A stopwatch tells you a
// response was fast; only the counter tells you the library was re-read.

/** How long a loaded library is served before it is read again. */
const TTL_MS = 60_000;

/** The tag the pipeline revalidates when it has written a cell. */
export const ENCYCLOPEDIA_TAG = "encyclopedia";

/** A number that changes when, and only when, the encyclopedia tag is
 *  revalidated.
 *
 *  This exists because a process-level cache cannot be dropped over HTTP. A
 *  route handler and a page render do not share module state — measured, with
 *  the same process id on both sides: `forget()` ran in the handler and the
 *  next page render was still served the copy the page's own module held. So
 *  an endpoint that called `forget` looked like it worked, and did nothing.
 *
 *  Next's cache is the thing both sides do share, so the signal travels
 *  through it instead. The value is one timestamp, not a library, so it costs
 *  nothing to read and nothing to store, and on a deployment with a shared
 *  data cache the signal reaches every instance rather than one process. */
const readEpoch = unstable_cache(
  async () => Date.now(),
  ["encyclopedia-epoch-v1"],
  { tags: [ENCYCLOPEDIA_TAG] },
);

const encyclopedia = heldRead(loadEncyclopedia, TTL_MS, "encyclopedia");

/** The epoch the held copy was read under. A change means the library has been
 *  written to since, and the copy is discarded whatever its age. */
let heldAt: number | null = null;

/** The encyclopedia, read at most once per TTL however many callers ask, and
 *  re-read as soon as the pipeline says the library has moved. */
export async function loadEncyclopediaCached(): Promise<EncyclopediaGraph> {
  const epoch = await readEpoch();
  if (heldAt !== null && heldAt !== epoch) encyclopedia.forget();
  heldAt = epoch;
  return encyclopedia.get();
}

/** Drop what this process holds. The tag is what makes a drop travel; this is
 *  the local half, for tests and for a caller already inside the render. */
export function forgetEncyclopedia(): void {
  heldAt = null;
  encyclopedia.forget();
}
