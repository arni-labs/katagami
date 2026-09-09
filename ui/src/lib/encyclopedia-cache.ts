import "server-only";

import { loadEncyclopedia, type EncyclopediaGraph } from "@/lib/encyclopedia";
import { heldRead } from "@/lib/held-read";

// Reading the encyclopedia costs seconds: every attested cell, then every
// record those cells name as a manifestation, over the network. The page is
// dynamic because it is owner-gated, but the answer does not depend on who is
// asking — every owner sees the same library — so paying for that read once
// per request was paying for it once per reader.
//
// Two things are true of the read that make this safe. It is a projection of
// rows nobody edits during a page view, and it is the same for everyone the
// gate lets through. So the result is held for a short while, and the ones
// asking for it while a read is already in flight wait on that read rather
// than starting their own.

/** How long a loaded library is served before it is read again. Short enough
 *  that a cell written now is on the page within a minute, long enough that a
 *  reader clicking around the encyclopedia pays for the read once. */
const TTL_MS = 60_000;

const encyclopedia = heldRead(loadEncyclopedia, TTL_MS, "encyclopedia");

/** The encyclopedia, read at most once per TTL however many callers ask. */
export function loadEncyclopediaCached(): Promise<EncyclopediaGraph> {
  return encyclopedia.get();
}

/** Drop what is held, so the next read goes to the backend. For tests and for
 *  the revalidate route. */
export function forgetEncyclopedia(): void {
  encyclopedia.forget();
}
