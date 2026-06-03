"use client";

import { useMemo, useState, useTransition } from "react";
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

function safeParse(raw?: string): Record<string, unknown> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function uiColors(o: UiOption): string[] {
  const t = safeParse(o.tokens);
  const c = (t.colors as Record<string, string>) ?? {};
  return [c.primary, c.accent, c.secondary, c.surface, c.background].filter(Boolean) as string[];
}
function paletteColors(o: PaletteOption): Record<string, string> {
  return safeParse(o.roles) as Record<string, string>;
}

export function RemixStudio({
  ui,
  palettes,
  art,
  saved = [],
}: {
  ui: UiOption[];
  palettes: PaletteOption[];
  art: ArtOption[];
  saved?: SavedMix[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uiIdx, setUiIdx] = useState(0);
  const [palIdx, setPalIdx] = useState(0);
  const [artIdx, setArtIdx] = useState(0);
  const [compIdx, setCompIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const selUi = ui[uiIdx];
  const selPal = palettes[palIdx];
  const selArt = art[artIdx];
  const comp = COMPOSITIONS[compIdx];
  const haveAll = ui.length > 0 && palettes.length > 0 && art.length > 0;

  const roles = useMemo(() => (selPal ? paletteColors(selPal) : {}), [selPal]);

  const slotImages = useMemo(() => {
    const refs = selArt?.refs ?? [];
    return comp.image_slots.map((slot, i) => ({
      slot,
      url: refs.length ? refs[i % refs.length] : (selArt?.thumb ?? ""),
    }));
  }, [selArt, comp]);

  // The preview is a real, themed embodiment screen (iframe srcdoc): the UI
  // language supplies typography/shape, the palette recolors every token, the
  // art style fills the image slots — recomputed live on any change.
  const embodimentHtml = useMemo(() => {
    if (!selUi) return "";
    const slots: Record<string, string> = {};
    for (const { slot, url } of slotImages) slots[slot.key] = url;
    return buildRemixEmbodiment({
      compositionKey: comp.key,
      uiName: selUi.name,
      artName: selArt?.name ?? "",
      tokens: safeParse(selUi.tokens) as never,
      roles,
      slots,
    });
  }, [selUi, selArt, comp, roles, slotImages]);

  const nameOf = (arr: { id: string; name: string }[], id: string) =>
    arr.find((x) => x.id === id)?.name ?? id.slice(0, 8);

  const compat = useMemo(() => {
    if (!selPal || !selArt) return null;
    const rated = saved.filter((s) => s.palette === selPal.id && s.art === selArt.id && s.rating > 0);
    if (!rated.length) return null;
    return { avg: rated.reduce((a, s) => a + s.rating, 0) / rated.length, n: rated.length };
  }, [saved, selPal, selArt]);

  function rand(n: number) {
    return Math.floor(Math.random() * n);
  }
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
    const slotAssignments = JSON.stringify(Object.fromEntries(slotImages.map((s) => [s.slot.key, s.url])));
    startTransition(async () => {
      await saveRemix({ designLanguageId: selUi.id, paletteSystemId: selPal.id, artStyleId: selArt.id, compositionKey: comp.key, slotAssignments });
      router.refresh();
    });
  }
  function doRate(id: string, rating: number) {
    startTransition(async () => {
      await rateRemix(id, rating);
      router.refresh();
    });
  }

  const tileBase =
    "relative shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-md)] border bg-card text-left transition-all";
  const tileSel = (on: boolean) =>
    on
      ? "border-foreground shadow-[0_2px_10px_rgba(30,35,45,0.12)] -translate-y-0.5"
      : "border-border hover:border-foreground/40";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-10">
      <PageHero
        eyebrow="Remix lane"
        eyebrowAccent="salad"
        title={<>The <Marker color="salad">remix</Marker> studio</>}
        description="Mix a UI language × a palette × an art style. The stage recolors live and the art lane fills the layout's image slots — no generation. Copy the brief for your agent, or save the mix and rate it."
      />

      {!haveAll && (
        <div className="paper-card mt-8 rounded-[var(--radius-lg)] p-5 text-sm text-muted-foreground">
          The studio needs at least one <b>Published</b> entry in each lane. Browse the{" "}
          <a href="/palettes" className="ink-underline text-foreground">palettes</a> and{" "}
          <a href="/art-styles" className="ink-underline text-foreground">art styles</a> catalogs.
        </div>
      )}

      {/* lane selection shelves */}
      <div className="mt-8 space-y-4">
        <Shelf label="UI language" href="/" count={ui.length}>
          {ui.map((o, i) => (
            <button key={o.id} onClick={() => setUiIdx(i)} className={`${tileBase} ${tileSel(i === uiIdx)} w-[150px]`}>
              <div className="flex h-9">
                {(uiColors(o).length ? uiColors(o) : ["#ddd"]).slice(0, 5).map((c, j) => (
                  <span key={j} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div className="truncate px-2.5 py-2 font-display text-[13px] font-bold text-foreground">{o.name}</div>
            </button>
          ))}
        </Shelf>

        <Shelf label="Palette" href="/palettes" count={palettes.length}>
          {palettes.map((o, i) => {
            const r = paletteColors(o);
            const keys = ["bg", "surface", "accent", "text", "success", "info"];
            return (
              <button key={o.id} onClick={() => setPalIdx(i)} className={`${tileBase} ${tileSel(i === palIdx)} w-[150px]`}>
                <div className="flex h-9">
                  {keys.map((k) => (
                    <span key={k} className="flex-1" style={{ background: r[k] ?? "#ddd" }} />
                  ))}
                </div>
                <div className="truncate px-2.5 py-2 font-display text-[13px] font-bold text-foreground">{o.name}</div>
              </button>
            );
          })}
        </Shelf>

        <Shelf label="Art style" href="/art-styles" count={art.length}>
          {art.map((o, i) => (
            <button key={o.id} onClick={() => setArtIdx(i)} className={`${tileBase} ${tileSel(i === artIdx)} w-[150px]`}>
              <div className="h-[68px] w-full overflow-hidden bg-muted">
                {o.refs[0] || o.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.refs[0] || o.thumb} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="truncate px-2.5 py-2">
                <div className="font-display text-[13px] font-bold leading-tight text-foreground">{o.name}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{o.medium}</div>
              </div>
            </button>
          ))}
        </Shelf>
      </div>

      {compat && (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground">
          <span style={{ color: "var(--matcha)" }}>★ {compat.avg.toFixed(1)}</span>
          {compat.n} rating{compat.n > 1 ? "s" : ""} — {selPal?.name} × {selArt?.name} pairs well
        </div>
      )}

      {/* composition tabs + actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {COMPOSITIONS.map((c, i) => (
          <button
            key={c.key}
            onClick={() => setCompIdx(i)}
            data-active={i === compIdx}
            className="rounded-full border border-border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground data-[active=true]:border-foreground data-[active=true]:bg-foreground data-[active=true]:text-background"
          >
            {c.name}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={shuffle} disabled={!haveAll} className="rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/40">
          🎲 Shuffle
        </button>
        <button onClick={doSave} disabled={!haveAll || pending} className="rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 disabled:opacity-50">
          {pending ? "Saving…" : "Save mix"}
        </button>
        <button onClick={copyBrief} disabled={!haveAll} className="rounded-[var(--radius-md)] bg-foreground px-3.5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50">
          {copied ? "Copied ✓" : "Copy brief"}
        </button>
      </div>

      {/* preview: live embodiment screen */}
      <div className="mt-5 overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[0_1px_2px_rgba(30,35,45,0.04),0_14px_40px_rgba(30,35,45,0.1)]">
        <div className="flex items-center gap-3 border-b border-border px-4 py-2.5" style={{ background: "color-mix(in srgb, var(--foreground) 4%, var(--card))" }}>
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full" style={{ background: "var(--sakura)" }} />
            <span className="h-3 w-3 rounded-full" style={{ background: "var(--yuzu)" }} />
            <span className="h-3 w-3 rounded-full" style={{ background: "var(--salad)" }} />
          </div>
          <div className="mx-auto w-full max-w-md truncate rounded-full border border-border bg-card px-3 py-1 text-center font-mono text-[11px] text-muted-foreground">
            {selUi?.name ?? "—"} · {selPal?.name ?? "—"} · {selArt?.name ?? "—"} — {comp.name}
          </div>
        </div>
        {selUi ? (
          <iframe
            title="Remix preview"
            srcDoc={embodimentHtml}
            className="block w-full bg-white"
            style={{ height: 700, border: 0 }}
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="grid h-[700px] place-items-center text-sm text-muted-foreground">No UI language selected.</div>
        )}
      </div>

      {/* saved mixes + rating */}
      {saved.length > 0 && (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Saved mixes · rate them to build the palette × art-style compatibility signal
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((m) => (
              <div key={m.id} className="rounded-[var(--radius-md)] border border-border px-3.5 py-3">
                <div className="text-[13px] text-foreground">
                  {nameOf(ui, m.ui)} · {nameOf(palettes, m.palette)} · {nameOf(art, m.art)}
                </div>
                <div className="mb-1.5 mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {COMPOSITIONS.find((c) => c.key === m.composition)?.name ?? m.composition}
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => doRate(m.id, n)} disabled={pending} aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`} className="p-0 text-[18px] leading-none disabled:cursor-default" style={{ background: "none", border: "none", cursor: pending ? "default" : "pointer", color: n <= m.rating ? "var(--yuzu)" : "var(--border)" }}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Shelf({
  label,
  href,
  count,
  children,
}: {
  label: string;
  href: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label} · {count}
        </span>
        <a href={href} className="ink-underline font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
          browse all →
        </a>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5">{children}</div>
    </div>
  );
}
