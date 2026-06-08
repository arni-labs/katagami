"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RemixPreview } from "@/components/remix/remix-preview";
import { CommandPicker, DrawerPicker, type PickItem } from "@/components/remix/entity-picker";
import { WashiTape } from "@/components/scrapbook";
import { buildRemixBrief } from "@/lib/remix-brief";
import { COMPOSITIONS } from "@/lib/remix-compositions";
import { saveRemix } from "@/app/remix-actions";
import type { Roles } from "@/lib/remix-theme";

export interface LanguageOpt {
  id: string;
  name: string;
  tokens: string;
  landingUrl: string;
  dashboardUrl: string;
  thumb?: string;
  tagline?: string;
  tags?: string[];
}
export interface PaletteOpt {
  id: string;
  name: string;
  roles: Roles;
  swatches: string[];
  mood?: string;
  temperature?: string;
  keyHue?: string;
  tags?: string[];
}
export interface ArtOpt {
  id: string;
  name: string;
  medium: string;
  hero: string;
  promptTemplate: string;
  negativePrompt: string;
  slotRecipes: string;
  refs: string[];
  tags?: string[];
}

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

function FixedChip({ label, name, media }: { label: string; name: string; media: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label} <span className="text-muted-foreground/50">· fixed</span>
      </div>
      <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-dashed border-border bg-[color-mix(in_srgb,var(--foreground)_3%,var(--card))] px-2.5 py-2">
        {media}
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{name}</span>
      </div>
    </div>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex h-8 w-12 shrink-0 overflow-hidden rounded-[2px] border border-border">
      {colors.slice(0, 6).map((c, i) => (
        <span key={i} className="h-full flex-1" style={{ background: c }} />
      ))}
    </span>
  );
}
function Thumb({ src }: { src?: string }) {
  return (
    <span className="h-8 w-12 shrink-0 overflow-hidden rounded-[2px] border border-border bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}

export function InlineRemix({
  languages,
  palettes,
  art,
  fixed = {},
  variant = "command",
  enableSave = false,
}: {
  languages: LanguageOpt[];
  palettes: PaletteOpt[];
  art: ArtOpt[];
  fixed?: { language?: string; palette?: string; art?: string };
  variant?: "command" | "drawer";
  enableSave?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [langId, setLangId] = useState(fixed.language ?? languages[0]?.id ?? "");
  const [palId, setPalId] = useState(fixed.palette ?? palettes[0]?.id ?? "");
  const [artId, setArtId] = useState(fixed.art ?? art[0]?.id ?? "");
  const [compIdx, setCompIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const lang = languages.find((l) => l.id === langId) ?? languages[0];
  const pal = palettes.find((p) => p.id === palId) ?? palettes[0];
  const sel = art.find((a) => a.id === artId) ?? art[0];
  const comp = COMPS[compIdx] ?? COMPS[0];

  const Picker = variant === "drawer" ? DrawerPicker : CommandPicker;

  const langItems: PickItem[] = useMemo(
    () =>
      languages.map((l) => ({
        id: l.id,
        name: l.name,
        subtitle: l.tagline,
        thumb: l.thumb,
        tags: l.tags,
      })),
    [languages],
  );
  const palItems: PickItem[] = useMemo(
    () =>
      palettes.map((p) => {
        const facets: Record<string, string> = {};
        if (p.temperature) facets.temperature = p.temperature;
        if (p.keyHue) facets.hue = p.keyHue;
        return {
          id: p.id,
          name: p.name,
          subtitle: [p.keyHue, p.temperature].filter(Boolean).join(" · ") || p.mood,
          swatches: p.swatches,
          tags: p.tags,
          facets,
        };
      }),
    [palettes],
  );
  const artItems: PickItem[] = useMemo(
    () =>
      art.map((a) => {
        const facets: Record<string, string> = {};
        if (a.medium) facets.medium = a.medium;
        return {
          id: a.id,
          name: a.name,
          subtitle: a.medium,
          thumb: a.hero,
          tags: a.tags,
          facets,
        };
      }),
    [art],
  );

  const compositionUrl = comp?.key === "compositions.dashboard" ? lang?.dashboardUrl ?? "" : lang?.landingUrl ?? "";
  const roles = pal?.roles ?? {};
  const hero = sel?.hero ?? "";
  const haveAll = Boolean(lang && pal && sel);

  function copyBrief() {
    if (!haveAll) return;
    const brief = buildRemixBrief({
      language: { name: lang.name, tokens: safeParse(lang.tokens) },
      palette: { name: pal.name, roles },
      artStyle: {
        name: sel.name,
        medium: sel.medium,
        promptTemplate: sel.promptTemplate,
        negativePrompt: sel.negativePrompt,
        slotRecipes: safeParse(sel.slotRecipes) as Record<string, string>,
        referenceUrls: sel.refs,
      },
      composition: comp,
    });
    void navigator.clipboard.writeText(brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function shuffle() {
    if (!fixed.language && languages.length) setLangId(languages[Math.floor(Math.random() * languages.length)].id);
    if (!fixed.palette && palettes.length) setPalId(palettes[Math.floor(Math.random() * palettes.length)].id);
    if (!fixed.art && art.length) setArtId(art[Math.floor(Math.random() * art.length)].id);
  }

  const canShuffle =
    (!fixed.language && languages.length > 1) ||
    (!fixed.palette && palettes.length > 1) ||
    (!fixed.art && art.length > 1);

  function doSave() {
    if (!haveAll) return;
    startTransition(async () => {
      await saveRemix({
        designLanguageId: lang.id,
        paletteSystemId: pal.id,
        artStyleId: sel.id,
        compositionKey: comp.key,
        slotAssignments: JSON.stringify({ hero }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* axis controls — pickers for swappable axes, chips for fixed ones */}
      <div className="grid gap-3 sm:grid-cols-3">
        {fixed.language ? (
          <FixedChip label="UI language" name={lang?.name ?? "—"} media={<Thumb src={lang?.thumb} />} />
        ) : (
          <Picker label="UI language" items={langItems} value={langId} onSelect={setLangId} />
        )}
        {fixed.palette ? (
          <FixedChip label="Palette" name={pal?.name ?? "—"} media={<Swatches colors={pal?.swatches ?? []} />} />
        ) : (
          <Picker label="Palette" items={palItems} value={palId} onSelect={setPalId} />
        )}
        {fixed.art ? (
          <FixedChip label="Art style" name={sel?.name ?? "—"} media={<Thumb src={sel?.hero} />} />
        ) : (
          <Picker label="Art style" items={artItems} value={artId} onSelect={setArtId} />
        )}
      </div>

      {/* toolbar: composition toggle + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[var(--radius-md)] border border-border bg-card p-0.5">
          {COMPS.map((c, i) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCompIdx(i)}
              data-active={i === compIdx}
              className="rounded-[calc(var(--radius-md)-2px)] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors data-[active=true]:bg-foreground data-[active=true]:text-background"
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {canShuffle ? (
          <button
            type="button"
            onClick={shuffle}
            className="rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-foreground/40"
          >
            Shuffle
          </button>
        ) : null}
        {enableSave ? (
          <button
            type="button"
            onClick={doSave}
            disabled={!haveAll || pending}
            className="rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-foreground/40 disabled:opacity-50"
          >
            {saved ? "Saved" : pending ? "Saving" : "Save mix"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={copyBrief}
          disabled={!haveAll}
          className="rounded-[var(--radius-md)] bg-foreground px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy brief"}
        </button>
      </div>

      {/* preview */}
      <div className="relative">
        <WashiTape color="sakura" rotate={-4} className="-left-4 -top-3" width={104} />
        <WashiTape color="salad" rotate={5} className="-right-4 -top-3" width={84} />
        <div className="relative overflow-hidden rounded-[2px] border border-border bg-card p-3 pb-9 shadow-[0_4px_16px_rgba(30,35,45,0.08)]">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{comp?.name ?? "Preview"}</span>
            <span className="hidden truncate font-mono text-[10px] lowercase tracking-[0.04em] text-muted-foreground/75 sm:block">
              {lang?.name ?? "—"} · {pal?.name ?? "—"} · {sel?.name ?? "—"}
            </span>
          </div>
          <div className="overflow-hidden rounded-[1px] border border-border">
            <RemixPreview compositionUrl={compositionUrl} roles={roles} hero={hero} />
          </div>
          <span className="absolute inset-x-0 bottom-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/75">
            live preview · recolored + filled
          </span>
        </div>
      </div>
    </div>
  );
}
