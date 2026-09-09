// The rule on its own, with no server-only import, so it can be exercised
// directly. `lab-preview.ts` is what the pages import: it carries the
// server-only guard that keeps this out of the browser bundle.

/** True only on a developer's machine, and only when asked for.
 *
 *  A production build compiles `process.env.NODE_ENV` to the literal
 *  "production", so this is a constant false there whatever the environment
 *  says, and the gate on the two owner-only pages is `isOwner()` alone. */
export function labPreviewRule(env: { NODE_ENV?: string; KATAGAMI_LAB_PREVIEW?: string }): boolean {
  return env.NODE_ENV === "development" && env.KATAGAMI_LAB_PREVIEW === "1";
}
