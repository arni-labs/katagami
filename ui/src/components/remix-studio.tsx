"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHero, Marker } from "@/components/page-hero";
import { buildRemixEmbodiment } from "@/lib/remix-embodiment";
import { buildRemixBrief } from "@/lib/remix-brief";
import { COMPOSITIONS } from "@/lib/remix-compositions";
import { saveRemix, rateRemix } from "@/app/remix-actions";

export interface SavedMix {
  id: string;
  ui: string;
  palette: string;
  art: string;
  composition: string;
  rating: number;
}
export interface UiOption {
  id: string;
  name: string;
  tokens: string;
  landingUrl: string;
  dashboardUrl: string;
}
export interface PaletteOption {
  id: string;
  name: string;
  roles: string;
  thumb: string;
}
export interface ArtOption {
  id: string;
  name: string;
  medium: string;
  promptTemplate: string;
  negativePrompt: string;
  slotRecipes: string;
  refs: string[];
  thumb: string;
}

// Only Landing + Dashboard.
const COMPS = COMPOSITIONS.filter((c) =>
  ["compositions.landing", "compositions.dashboard"].includes(c.key),
);

function safeParse(raw?: string): Record<string, unknown> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
function uiColors(o: UiOption): string[] {
  const c = (safeParse(o.tokens).colors as Record<string, string>) ?? {};
  return [c.primary, c.accent, c.secondary, c.surface, c.background].filter(Boolean) as string[];
}
function paletteColors(o: PaletteOption): Record<string, string> {
  return safeParse(o.roles) as Record<string, string>;
}
function readable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || "").trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const L = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return L > 0.62 ? "#16181d" : "#ffffff";
}
function themeOverride(roles: Record<string, string>, hero: string): string {
  const a = roles.accent || "#3a6df0";
  const decl = [
    ["--bg", roles.bg || "#ffffff"], ["--surface", roles.surface || "#f5f5f4"],
    ["--text", roles.text || "#16181d"], ["--muted", roles.muted || "#6b7280"],
    ["--border", roles.border || "#e5e7eb"], ["--accent", a], ["--on-accent", readable(a)],
    ["--success", roles.success || "#16a34a"], ["--warning", roles.warning || "#d97706"],
    ["--error", roles.error || "#dc2626"], ["--info", roles.info || "#2563eb"],
  ].map(([k, v]) => `${k}:${v}`);
  if (hero) decl.push(`--hero-image:url('${hero}')`);
  return `<style id="remix-theme">:root{${decl.join(";")}}</style>`;
}

export function RemixStudio({
  ui, palettes, art, saved = [],
}: {
  ui: UiOption[]; palettes: PaletteOption[]; art: ArtOption[]; saved?: SavedMix[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uiIdx, setUiIdx] = useState(0);
  const [palIdx, setPalIdx] = useState(0);
  const [artIdx, setArtIdx] = useState(0);
  const [compIdx, setCompIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [rawHtml, setRawHtml] = useState("");

  const selUi = ui[uiIdx];
  const selPal = palettes[palIdx];
  const selArt = art[artIdx];
  const comp = COMPS[compIdx] ?? COMPS[0];
  const haveAll = ui.length > 0 && palettes.length > 0 && art.length > 0;
  const roles = useMemo(() => (selPal ? paletteColors(selPal) : {}), [selPal]);
  const artHero = selArt?.refs?.[0] || selArt?.thumb || "";

  // fetch the selected language's bespoke composition embodiment
  const compUrl = comp?.key === "compositions.dashboard" ? selUi?.dashboardUrl : selUi?.landingUrl;
  useEffect(() => {
    let cancelled = false;
    if (!compUrl) { setRawHtml(""); return; }
    fetch(compUrl)
      .then((r) => (r.ok ? r.text() : ""))
      .then((t) => { if (!cancelled) setRawHtml(t); })
      .catch(() => { if (!cancelled) setRawHtml(""); });
    return () => { cancelled = true; };
  }, [compUrl]);

  // inject palette + hero image; fall back to a generated screen if the
  // language has no bespoke composition embodiment.
  const previewHtml = useMemo(() => {
    if (rawHtml) {
      const ov = themeOverride(roles, artHero);
      return rawHtml.includes("</head>") ? rawHtml.replace("</head>", `${ov}</head>`) : ov + rawHtml;
    }
    if (!selUi) return "";
    return buildRemixEmbodiment({
      compositionKey: comp.key, uiName: selUi.name, artName: selArt?.name ?? "",
      tokens: safeParse(selUi.tokens) as never, roles, slots: { hero: artHero },
    });
  }, [rawHtml, roles, artHero, selUi, selArt, comp]);

  const nameOf = (arr: { id: string; name: string }[], id: string) =>
    arr.find((x) => x.id === id)?.name ?? id.slice(0, 8);
  const compat = useMemo(() => {
    if (!selPal || !selArt) return null;
    const rated = saved.filter((s) => s.palette === selPal.id && s.art === selArt.id && s.rating > 0);
    if (!rated.length) return null;
    return { avg: rated.reduce((a, s) => a + s.rating, 0) / rated.length, n: rated.length };
  }, [saved, selPal, selArt]);

  function rand(n: number) { return Math.floor(Math.random() * n); }
  function shuffle() {
    if (ui.length) setUiIdx(rand(ui.length));
    if (palettes.length) setPalIdx(rand(palettes.length));
    if (art.length) setArtIdx(rand(art.length));
  }
  function copyBrief() {
    if (!haveAll) return;
    const brief = buildRemixBrief({
      language: { name: selUi.name, tokens: safeParse(selUi.tokens) },
      palette: { name: selPal.name, roles },
      artStyle: {
        name: selArt.name, medium: selArt.medium, promptTemplate: selArt.promptTemplate,
        negativePrompt: selArt.negativePrompt, slotRecipes: safeParse(selArt.slotRecipes) as Record<string, string>,
        referenceUrls: selArt.refs,
      },
      composition: comp,
    });
    void navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  function doSave() {
    if (!haveAll) return;
    startTransition(async () => {
      await saveRemix({
        designLanguageId: selUi.id, paletteSystemId: selPal.id, artStyleId: selArt.id,
        compositionKey: comp.key, slotAssignments: JSON.stringify({ hero: artHero }),
      });
      router.refresh();
    });
  }
  function doRate(id: string, rating: number) {
    startTransition(async () => { await rateRemix(id, rating); router.refresh(); });
  }

  const row = "flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border px-2.5 py-2 text-left transition-colors";
  const sel = (on: boolean) => (on ? "border-foreground bg-[color-mix(in_srgb,var(--foreground)_5%,var(--card))]" : "border-border hover:border-foreground/40");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Remix lane"
        eyebrowAccent="salad"
        title={<>The <Marker color="salad">remix</Marker> studio</>}
        description="Pick a UI language, a palette, and an art style. The preview is that language's own landing & dashboard — recolored by the palette and given the art style's hero image. Live, no generation."
      />

      {!haveAll && (
        <div className="paper-card mt-8 rounded-[var(--radius-lg)] p-5 text-sm text-muted-foreground">
          Needs a Published entry in each lane — see the{" "}
          <a href="/palettes" className="ink-underline text-foreground">palettes</a> and{" "}
          <a href="/art-styles" className="ink-underline text-foreground">art styles</a> catalogs.
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* control rail */}
        <aside className="space-y-5">
          <LaneList label="UI language" browse="/" count={ui.length}>
            {ui.map((o, i) => (
              <button key={o.id} onClick={() => setUiIdx(i)} className={`${row} ${sel(i === uiIdx)}`}>
                <span className="flex h-7 w-10 shrink-0 overflow-hidden rounded-[3px] border border-border">
                  {(uiColors(o).length ? uiColors(o) : ["#ddd"]).slice(0, 4).map((c, j) => (
                    <span key={j} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
                <span className="truncate text-[13px] font-medium text-foreground">{o.name}</span>
              </button>
            ))}
          </LaneList>

          <LaneList label="Palette" browse="/palettes" count={palettes.length}>
            {palettes.map((o, i) => {
              const r = paletteColors(o);
              return (
                <button key={o.id} onClick={() => setPalIdx(i)} className={`${row} ${sel(i === palIdx)}`}>
                  <span className="flex h-7 w-10 shrink-0 overflow-hidden rounded-[3px] border border-border">
                    {["bg", "surface", "accent", "text", "success", "info"].map((k) => (
                      <span key={k} className="flex-1" style={{ background: r[k] ?? "#ddd" }} />
                    ))}
                  </span>
                  <span className="truncate text-[13px] font-medium text-foreground">{o.name}</span>
                </button>
              );
            })}
          </LaneList>

          <LaneList label="Art style" browse="/art-styles" count={art.length}>
            {art.map((o, i) => (
              <button key={o.id} onClick={() => setArtIdx(i)} className={`${row} ${sel(i === artIdx)}`}>
                <span className="h-7 w-10 shrink-0 overflow-hidden rounded-[3px] border border-border bg-muted">
                  {o.refs[0] || o.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.refs[0] || o.thumb} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-foreground">{o.name}</span>
                  <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{o.medium}</span>
                </span>
              </button>
            ))}
          </LaneList>

          {compat && (
            <div className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2.5 text-[12px] text-foreground">
              <span className="font-mono" style={{ color: "var(--matcha)" }}>★ {compat.avg.toFixed(1)}</span>{" "}
              <span className="text-muted-foreground">· {compat.n} rating{compat.n > 1 ? "s" : ""} — pairs well</span>
            </div>
          )}
        </aside>

        {/* preview */}
        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[var(--radius-md)] border border-border p-0.5">
              {COMPS.map((c, i) => (
                <button
                  key={c.key}
                  onClick={() => setCompIdx(i)}
                  data-active={i === compIdx}
                  className="rounded-[calc(var(--radius-md)-2px)] px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors data-[active=true]:bg-foreground data-[active=true]:text-background"
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={shuffle} disabled={!haveAll} className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:border-foreground/40 disabled:opacity-50">🎲</button>
            <button onClick={doSave} disabled={!haveAll || pending} className="rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 disabled:opacity-50">{pending ? "Saving…" : "Save"}</button>
            <button onClick={copyBrief} disabled={!haveAll} className="rounded-[var(--radius-md)] bg-foreground px-3.5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">{copied ? "Copied ✓" : "Copy brief"}</button>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[0_1px_2px_rgba(30,35,45,0.04),0_18px_44px_rgba(30,35,45,0.12)]">
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5" style={{ background: "color-mix(in srgb, var(--foreground) 4%, var(--card))" }}>
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full" style={{ background: "var(--sakura)" }} />
                <span className="h-3 w-3 rounded-full" style={{ background: "var(--yuzu)" }} />
                <span className="h-3 w-3 rounded-full" style={{ background: "var(--salad)" }} />
              </div>
              <div className="mx-auto w-full max-w-md truncate rounded-full border border-border bg-card px-3 py-1 text-center font-mono text-[11px] text-muted-foreground">
                {selUi?.name ?? "—"} · {selPal?.name ?? "—"} · {selArt?.name ?? "—"}
              </div>
            </div>
            {selUi ? (
              <iframe title="Remix preview" srcDoc={previewHtml} className="block w-full bg-white" style={{ height: 720, border: 0 }} sandbox="allow-same-origin" />
            ) : (
              <div className="grid h-[720px] place-items-center text-sm text-muted-foreground">No UI language selected.</div>
            )}
          </div>

          {saved.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Saved mixes · rate to build the compatibility signal</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {saved.map((m) => (
                  <div key={m.id} className="rounded-[var(--radius-md)] border border-border px-3.5 py-3">
                    <div className="text-[13px] text-foreground">{nameOf(ui, m.ui)} · {nameOf(palettes, m.palette)} · {nameOf(art, m.art)}</div>
                    <div className="mb-1.5 mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{COMPS.find((c) => c.key === m.composition)?.name ?? m.composition}</div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => doRate(m.id, n)} disabled={pending} aria-label={`Rate ${n}`} style={{ background: "none", border: "none", cursor: pending ? "default" : "pointer", color: n <= m.rating ? "var(--yuzu)" : "var(--border)", fontSize: 18, lineHeight: 1, padding: 0 }}>★</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LaneList({ label, browse, count, children }: { label: string; browse: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label} · {count}</span>
        <a href={browse} className="ink-underline font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">all →</a>
      </div>
      <div className="max-h-[208px] space-y-1.5 overflow-y-auto pr-1">{children}</div>
    </div>
  );
}
