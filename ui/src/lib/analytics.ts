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

type RumModule = typeof import("@datadog/browser-rum");
type RumGlobal = RumModule["datadogRum"];

let rum: RumGlobal | null = null;
let initialized = false;

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
  const e = readEnv();
  if (!e.applicationId || !e.clientToken) return; // no creds → stay a no-op
  initialized = true;
  try {
    const mod = await import("@datadog/browser-rum");
    rum = mod.datadogRum;
    rum.init({
      applicationId: e.applicationId,
      clientToken: e.clientToken,
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
  } catch {
    // SDK failed to load — leave as a no-op, never surface to the user.
    rum = null;
  }
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

/** Low-level: record a custom RUM action. No-op until RUM is ready. */
export function track(name: string, attributes: Attributes = {}): void {
  if (!rum || !initialized) return;
  try {
    rum.addAction(name, clean(attributes));
  } catch {
    /* analytics must never throw into the UI */
  }
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
