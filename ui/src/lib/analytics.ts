// Datadog RUM analytics for katagami.ai.
//
// Design goals:
//  - Zero-cost no-op until init runs, and a permanent no-op when the
//    NEXT_PUBLIC_DD_RUM_* env vars are absent. Importing or calling any
//    helper here must never throw — analytics can't break the site.
//  - The SDK is loaded lazily (dynamic import) only in the browser and only
//    when credentials exist, so it never enters the SSR/server bundle.
//
// What we get for free from RUM once initialized:
//  - Unique visits / sessions and pageviews per route (the SDK patches the
//    History API, so every App Router navigation becomes a new RUM "view"
//    with @view.url_path — e.g. /language/<id>). That is the primary signal
//    for "which languages get traffic".
// What the custom actions below add:
//  - Attribution (which surface drove a click), and events that aren't a
//    navigation at all: copy-to-clipboard, downloads, search, compare.

import { waitForIdentityOrSignedOut } from "./session-me-core.mjs";

type RumModule = typeof import("@datadog/browser-rum");
type RumGlobal = RumModule["datadogRum"];

let rum: RumGlobal | null = null;
let initialized = false;
// In-flight start so a second initRum joins the first instead of no-op'ing
// while identity is still resolving — and so a throw leaves initialized
// false for a later retry.
let starting: Promise<void> | null = null;
// undefined = never told; null = signed out (clear); string = the hash.
let desiredUserHash: string | null | undefined;
// The hash last applied to the SDK (same tri-state as desiredUserHash).
let appliedUserHash: string | null | undefined;
const identityWaiters: Array<() => void> = [];

function readEnv() {
  return {
    applicationId: process.env.NEXT_PUBLIC_DD_RUM_APPLICATION_ID,
    clientToken: process.env.NEXT_PUBLIC_DD_RUM_CLIENT_TOKEN,
    site: process.env.NEXT_PUBLIC_DD_RUM_SITE || "datadoghq.com",
    service: process.env.NEXT_PUBLIC_DD_RUM_SERVICE || "katagami-web",
    env: process.env.NEXT_PUBLIC_DD_RUM_ENV || "production",
    version: process.env.NEXT_PUBLIC_DD_RUM_VERSION || undefined,
    sampleRate: Number(process.env.NEXT_PUBLIC_DD_RUM_SAMPLE_RATE ?? "100"),
    // Session replay records the actual screen (DOM) of a % of sessions. Off by
    // default — this setup is for usage counts, not screen recordings. Flip via
    // env (e.g. 20) to enable, no code change needed.
    replaySampleRate: Number(process.env.NEXT_PUBLIC_DD_RUM_REPLAY_SAMPLE_RATE ?? "0"),
  };
}

/** True when RUM credentials are configured. */
export function rumEnabled(): boolean {
  const e = readEnv();
  return Boolean(e.applicationId && e.clientToken);
}

/** Initialize the RUM SDK once, in the browser. Safe to call repeatedly. */
export async function initRum(): Promise<void> {
  if (initialized || typeof window === "undefined") return;
  if (starting) return starting;
  const e = readEnv();
  const applicationId = e.applicationId;
  const clientToken = e.clientToken;
  if (!applicationId || !clientToken) return; // no creds → stay a no-op
  starting = (async () => {
    try {
      // Import and session identity in parallel (RumInit starts both). Do not
      // flush until the session is known: otherwise the first language_view
      // (and anything else buffered during the import) ships with no @usr.id
      // and the later setRumUser cannot retrofit those events.
      //
      // Do not mark initialized before that wait: a hung /api/auth/me used
      // to leave initialized=true with the SDK never started, so later
      // initRum() no-op'd forever. whenIdentityKnown times out as signed-out.
      const [mod] = await Promise.all([
        import("@datadog/browser-rum"),
        whenIdentityKnown(),
      ]);
      rum = mod.datadogRum;
      rum.init({
        applicationId,
        clientToken,
        site: e.site,
        service: e.service,
        env: e.env,
        version: e.version,
        sessionSampleRate: Number.isFinite(e.sampleRate) ? e.sampleRate : 100,
        sessionReplaySampleRate: Number.isFinite(e.replaySampleRate)
          ? e.replaySampleRate
          : 0,
        trackUserInteractions: true, // automatic click map in addition to our actions
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: "mask-user-input",
      });
      // Identity is already known (whenIdentityKnown). Apply it before
      // flushPending so replayed actions — language_view on a signed-in
      // hard reload — carry @usr.id instead of flushing anonymous.
      applyDesiredUser();
      flushPending();
      initialized = true;
    } catch {
      // SDK failed to load — leave as a no-op, never surface to the user.
      // initialized stays false so a later initRum can retry.
      rum = null;
    } finally {
      starting = null;
    }
  })();
  return starting;
}

type AttrValue = string | number | boolean | undefined | null;
type Attributes = Record<string, AttrValue>;

function clean(attrs: Attributes): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}

// The RUM SDK is imported lazily, so events fired between first paint and the
// import resolving (notably the on-mount `language_view`) arrive while `rum` is
// still null. Buffer those (capped) and flush them in initRum once the SDK is
// ready, instead of silently dropping them.
const MAX_PENDING = 50;
const pending: Array<{ name: string; attributes: Attributes }> = [];

function flushPending(): void {
  if (!rum) return;
  // A signed-in hash is known but not yet attached — keep buffering.
  // Flushing now would replay those events as anonymous after the session
  // is already known; setRumUser/applyDesiredUser flush once it is applied.
  if (desiredUserHash && appliedUserHash !== desiredUserHash) return;
  const queued = pending.splice(0, pending.length);
  for (const ev of queued) {
    try {
      rum.addAction(ev.name, clean(ev.attributes));
    } catch {
      /* analytics must never throw into the UI */
    }
  }
}

/** Low-level: record a custom RUM action. Buffers until the SDK is ready; a
 *  permanent no-op when RUM credentials are absent. */
export function track(name: string, attributes: Attributes = {}): void {
  if (typeof window === "undefined" || !rumEnabled()) return;
  // Buffer while the SDK is missing OR a signed-in hash is known but not
  // yet attached — live addAction here would ship without @usr.id.
  if (!rum || (desiredUserHash && appliedUserHash !== desiredUserHash)) {
    if (pending.length < MAX_PENDING) pending.push({ name, attributes });
    return;
  }
  try {
    rum.addAction(name, clean(attributes));
  } catch {
    /* analytics must never throw into the UI */
  }
}

// ---- Session identity (ARN-451) --------------------------------------------
//
// Joins browsing to the account: after sign-in, RUM events carry the same
// peppered @usr.id the server stamps on auth_login/mcp_tool_call as
// @user_hash. ONLY the hash ever reaches this file — never a sub, email, or
// name (RUM payloads are client-visible, and datadogRum.setUser ships every
// field it is given). Buffered like events: set/clear before the SDK finishes
// importing is applied by initRum, which waits for this identity before
// flushPending so replayed actions already carry @usr.id.

function whenIdentityKnown(): Promise<void> {
  return waitForIdentityOrSignedOut({
    isKnown: () => desiredUserHash !== undefined,
    markSignedOut: () => {
      if (desiredUserHash === undefined) desiredUserHash = null;
    },
    addWaiter: (resolve: () => void) => identityWaiters.push(resolve),
  });
}

function notifyIdentityKnown(): void {
  if (identityWaiters.length === 0) return;
  const waiters = identityWaiters.splice(0, identityWaiters.length);
  for (const resolve of waiters) resolve();
}

function applyDesiredUser(): void {
  if (!rum || desiredUserHash === undefined) return;
  try {
    if (desiredUserHash) rum.setUser({ id: desiredUserHash });
    else rum.clearUser();
    appliedUserHash = desiredUserHash;
  } catch {
    /* analytics must never throw into the UI */
  }
}

/** Exactly the shape hashPrincipal emits — anything else must not become
 *  @usr.id (mirror of isValidUserHash; kept inline so this stays a leaf
 *  client module). */
const USER_HASH_RE = /^[0-9a-f]{16}$/;

/** Attach the signed-in account's telemetry hash to all RUM events. A value
 *  that is not a 16-hex hash clears instead — an unexpected server response
 *  must never ride into @usr.id. */
export function setRumUser(userHash: string): void {
  if (typeof window === "undefined" || !rumEnabled()) return;
  desiredUserHash = USER_HASH_RE.test(userHash) ? userHash : null;
  notifyIdentityKnown();
  applyDesiredUser();
  flushPending();
}

/** Drop the RUM user (signed out, or no hash available). */
export function clearRumUser(): void {
  if (typeof window === "undefined" || !rumEnabled()) return;
  desiredUserHash = null;
  notifyIdentityKnown();
  applyDesiredUser();
  flushPending();
}

// ---- Typed event helpers (the only API the components should use) ----------

/** Click that navigates to a design-language detail page. `source` says which
 *  surface drove it (card | related | taxonomy | lineage | search | nav | hero …). */
export function trackLanguageClick(d: {
  languageId: string;
  languageName?: string;
  source: string;
  page?: string;
}): void {
  track("language_click", {
    language_id: d.languageId,
    language_name: d.languageName,
    source: d.source,
    page: d.page,
  });
}

/** A design-language DETAIL page was viewed. RUM already records the page view
 *  automatically (keyed by @view.url_path = /language/<id>), but that carries
 *  only the id. This custom event additionally carries the human NAME (and slug)
 *  so dashboards can rank languages by readable name, not opaque ids. Fire once
 *  per detail-page mount; dedupe to unique visitors via @usr.anonymous_id. */
export function trackLanguageView(d: {
  languageId: string;
  languageName?: string;
  slug?: string;
}): void {
  track("language_view", {
    language_id: d.languageId,
    language_name: d.languageName,
    slug: d.slug,
  });
}

/** Copy-to-clipboard. `artifact` names what was copied (design_md | shadcn_md |
 *  katagami | link | css_var | color | prompt | brief …). `languageName` is
 *  carried so copies can be ranked by readable language name. */
export function trackCopy(d: {
  artifact: string;
  languageId?: string;
  languageName?: string;
  paletteId?: string;
  label?: string;
  page?: string;
}): void {
  track("copy", {
    artifact: d.artifact,
    language_id: d.languageId,
    language_name: d.languageName,
    palette_id: d.paletteId,
    label: d.label,
    page: d.page,
  });
}

/** File download (DESIGN.md, shadcn.json, zip, png …). */
export function trackDownload(d: {
  file: string;
  format?: string;
  languageId?: string;
  languageName?: string;
  paletteId?: string;
  page?: string;
}): void {
  track("download", {
    file: d.file,
    format: d.format,
    language_id: d.languageId,
    language_name: d.languageName,
    palette_id: d.paletteId,
    page: d.page,
  });
}

/** Search usage. Query text is truncated; we never store more than 100 chars. */
export function trackSearch(d: {
  query: string;
  resultsCount?: number;
}): void {
  const q = (d.query || "").trim();
  if (!q) return;
  track("search", {
    query: q.slice(0, 100),
    query_length: q.length,
    results_count: d.resultsCount,
  });
}

/** A language was added to / removed from the compare tray. */
export function trackCompare(d: {
  action: "add" | "remove" | "open";
  languageId?: string;
  count?: number;
}): void {
  track("compare", {
    compare_action: d.action,
    language_id: d.languageId,
    count: d.count,
  });
}

/** Primary navigation click (header / mobile nav / footer). */
export function trackNav(d: { target: string; source?: string }): void {
  track("nav_click", { target: d.target, source: d.source });
}
