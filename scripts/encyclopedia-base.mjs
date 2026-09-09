// `Define` replaces a cell's whole document, so two runs changing different
// parts of one cell have no safe ordering: the second write wins and the first
// is lost, with no error on either side. It happened on the night of
// 2026-09-09, when one run added manifestations to five cells while another
// rewrote their prose from a copy taken before those writes.
//
// A payload built from a document it read states `baseHash`, the sha256 of the
// document as it read it, and the write is refused when the stored document has
// moved since. Declaring it is not optional: a payload that would replace the
// document of a cell that already holds one, and does not say which bytes it
// was built from, is refused too. Opt-in was not enough: a run that omits the
// field overwrites exactly as before, so the guard would have depended on every
// author remembering it. Replaying the exact bytes already stored is not a
// conflict, and creating a cell that holds nothing needs no base.
import { createHash } from "node:crypto";

export const documentHash = (document) => createHash("sha256").update(document).digest("hex");

export function baseConflict({ id, baseHash, stored, writing }) {
  if (stored === undefined || stored === "") return null;
  if (stored === writing) return null;
  if (baseHash === undefined) {
    return `'${id}' already holds a document and this payload does not say which bytes it was built from. Read the cell, put the sha256 of its stored document in the cell's baseHash, and rebuild your change on those bytes.`;
  }
  const storedHash = documentHash(stored);
  if (storedHash === baseHash) return null;
  return `'${id}' has changed since this payload was built (stored ${storedHash.slice(0, 12)}, payload based on ${baseHash.slice(0, 12)}); re-read it and rebuild on the document production holds now, re-applying only your own change`;
}
