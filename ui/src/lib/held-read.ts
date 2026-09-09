// A read held for a while and shared.
//
// Written once, here, rather than at each call site that needs it: the three
// behaviours that matter are easy to get subtly wrong, and two of them are
// only visible under load. Nothing in here is specific to the encyclopedia.

/** A read held for a while and shared, with the three behaviours that matter
 *  written once rather than at each call site: a hit inside the window costs
 *  nothing, callers arriving during a read wait on that read rather than
 *  starting their own, and a failure is never cached — though a copy already
 *  in hand beats serving the failure. */
export function heldRead<T>(read: () => Promise<T>, ttlMs: number, describe = "read") {
  let current: { value: T; at: number } | null = null;
  let inFlight: Promise<T> | null = null;

  const get = (): Promise<T> => {
    const now = Date.now();
    if (current && now - current.at < ttlMs) return Promise.resolve(current.value);
    if (inFlight) return inFlight;

    const previous = current;
    inFlight = read()
      .then((value) => {
        current = { value, at: Date.now() };
        return value;
      })
      .catch((error: unknown) => {
        if (previous) {
          // It was readable a moment ago and is not now. Serving what we have
          // beats a five hundred, but the failure is not swallowed: it goes to
          // the log the way every other read failure does.
          console.error(`${describe} refresh failed; serving the previous read`, error);
          return previous.value;
        }
        throw error;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  /** Drop what is held, so the next caller goes to the source. */
  const forget = () => {
    current = null;
  };

  return { get, forget };
}

