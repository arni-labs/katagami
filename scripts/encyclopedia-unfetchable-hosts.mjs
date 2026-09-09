// Hosts that cannot be cited by a script, and the measurement behind each one.
//
// A merge row is excused only when its reference lives on a host named here.
// The first version of the merge check excused a row on the strength of a
// sentence in its own note, which a verifier broke by pointing a row at a page
// that answers and pasting the sentence in. The second version fetched the page
// instead, which is honest but is not a gate: artsy.net refuses roughly two
// requests in three, so the verdict, and with it the exit code, came out
// differently on each run.
//
// A host list fixes both. It is data rather than prose, so adding to it is a
// reviewable change rather than a sentence the audited author writes. It is
// keyed by host rather than by row, so it cannot be aimed at one inconvenient
// row: the verifier's attack pointed a row at en.wikipedia.org, and no entry
// here excuses that. And it is stable, so the gate returns the same answer twice
// in a row.
//
// Add a host only with a measurement, and re-measure when you do. A host that
// starts answering should leave this list and its rows should be completed.
export const UNFETCHABLE_HOSTS = new Map([
  ["www.artsy.net", "Gene pages answer HTTP 403 to scripts. Measured 2026-09-09: roughly one request in three succeeds, with no pattern, and spacing requests 20 to 90 seconds apart does not improve it. Twenty-four merge citations were attempted one cell at a time and every one was refused at write time by the loader's own fetch."],
]);

export const unfetchableHost = (url) => {
  try { return UNFETCHABLE_HOSTS.get(new URL(url).host) ?? null; } catch { return null; }
};
