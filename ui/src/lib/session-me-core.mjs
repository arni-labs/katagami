// Testable pieces of the shared /api/auth/me fetch (ARN-451).
// session-me.ts is the client wrapper (fetch, memo). Tests import this
// file so a hung session abort and the identity-wait fallback can be
// exercised without a browser.

/** Hung /api/auth/me must cost a bounded wait, never a permanent RUM
 *  no-op — the same 5s bound as countMembers / activity dispatch. */
export const SESSION_ME_TIMEOUT_MS = 5_000;

export function sessionMeAbortSignal(timeoutMs = SESSION_ME_TIMEOUT_MS) {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Resolve when session identity is known (setRumUser / clearRumUser),
 * or treat a hung /api/auth/me as signed-out so RUM can still init.
 *
 * `isKnown` is true once desired identity is no longer undefined.
 * `markSignedOut` must set that identity to null if it is still unknown.
 * `addWaiter` registers the callback those setters fire.
 */
export function waitForIdentityOrSignedOut({
  isKnown,
  markSignedOut,
  addWaiter,
  timeoutMs = SESSION_ME_TIMEOUT_MS,
}) {
  if (isKnown()) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(() => {
      markSignedOut();
      settle();
    }, timeoutMs);
    addWaiter(() => {
      clearTimeout(timer);
      settle();
    });
  });
}
