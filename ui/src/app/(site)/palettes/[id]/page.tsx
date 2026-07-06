import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getPaletteSystem,
  listDesignLanguages,
  listArtStyles,
  paletteCore,
  paletteDisplayName,
  paletteRampStopHex,
  parseJson,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import { readableTextColor } from "@/lib/shadcn-export";
import { PageHero } from "@/components/page-hero";
import { StickyNote, SectionHeading, Stamp, Perforation } from "@/components/scrapbook";
import { Credits } from "@/components/credits";
import { ModelProvenance } from "@/components/model-provenance";
import { CopyButton } from "@/components/copy-button";
import { InlineRemix } from "@/components/remix/inline-remix";
import { KX_BTN_PAPER } from "@/lib/katagami-ui";

const CHIP = "bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))]";

export const dynamic = "force-dynamic";

const NEUTRAL_ORDER = ["bg", "surface", "text", "muted", "border"];
const SEMANTIC_ORDER = ["success", "warning", "error", "info"];
type PaletteRamp = Record<string, string | { hex?: string }>;

function rampHexes(ramp: PaletteRamp | undefined): string[] {
  if (!ramp) return [];
  return Object.entries(ramp)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, stop]) => paletteRampStopHex(stop))
    .filter((hex): hex is string => Boolean(hex));
}

export default async function PaletteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let pal;
  try {
    pal = await getPaletteSystem(id);
  } catch {
    notFound();
  }
  // Non-published entries are the curator's queue: owner sees them (preview),
  // everyone else gets a 404. The owner check runs ONLY on this branch, so
  // Published renders never touch cookies() and stay cacheable.
  if (pal.status !== "Published" && !(await isOwner())) notFound();

  const f = pal.fields;
  const core = paletteCore(f);
  const ramps = parseJson<Record<string, PaletteRamp>>(f.ramps) ?? {};
  const guidance = parseJson<{ do?: string[]; dont?: string[] }>(f.usage_guidance);
  const tags = parseJson<string[]>(f.tags) ?? [];
  const name = paletteDisplayName(f, core);
  const slug = f.slug ?? id.slice(0, 8);

  const flat: Record<string, string> = {
    ...core.neutrals,
    ...(core.signature[0]?.hex ? { accent: core.signature[0].hex } : {}),
    ...core.semantic,
  };
  const tokensCss =
    `/* ${name} — Katagami palette tokens */\n:root {\n` +
    Object.entries(flat)
      .map(([k, v]) => `  --ds-${k}: ${v};`)
      .join("\n") +
    "\n}\n";

  const [languages, artStyles] = await Promise.all([
    listDesignLanguages("Status eq 'Published'").catch(() => []),
    listArtStyles().catch(() => []),
  ]);
  const palOpts = toPaletteOpts([pal]);
  const langOpts = toLanguageOpts(languages);
  const artOpts = toArtOpts(artStyles);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:py-10">
      <Link
        href="/palettes"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to palettes
      </Link>

      <PageHero
        eyebrow="Color lane"
        eyebrowAccent="graphite"
        title={
          <span className="relative inline-block">
            {name}
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-0 h-[3px] w-12 rounded-[2px]"
              style={{ background: core.signature[0]?.hex ?? "var(--sumi)" }}
            />
          </span>
        }
        description={core.mood.summary ?? "A curated color system: signature, neutral ground, and a small semantic accessory."}
        rightSlot={
          <>
            {core.mood.temperature ? <Stamp color="ramune">{core.mood.temperature}</Stamp> : null}
            {core.mood.key_hue ? <Stamp color="sumire">{core.mood.key_hue}</Stamp> : null}
          </>
        }
      />

      {/* specimen */}
      <StickyNote tint="ramune" className="p-5 sm:p-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Signature · the star</div>
        <div className="flex gap-2 overflow-hidden rounded-[2px]" style={{ height: 120 }}>
          {(core.signature.length ? core.signature : [{ hex: "#888", name: "—" }]).slice(0, 4).map((s, i) => {
            const txt = readableTextColor(s.hex, "#fff");
            return (
              <div key={i} className="relative flex flex-1 flex-col justify-between rounded-[2px] p-2.5" style={{ background: s.hex }}>
                {i === 0 ? <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: txt }}>primary accent</span> : <span />}
                <span className="font-mono text-[11px] lowercase" style={{ color: txt }}>{(s.name ? `${s.name} · ` : "") + s.hex.toLowerCase()}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Neutrals · the ground</div>
        <div className="flex gap-2">
          {NEUTRAL_ORDER.map((k) => {
            const c = core.neutrals[k] ?? "#ddd";
            return (
              <div key={k} className="flex-1 overflow-hidden rounded-[2px]">
                <div style={{ background: c, height: 44 }} />
                <div className="bg-card px-1.5 py-1 font-mono text-[9px] lowercase text-muted-foreground">
                  {k}<br />
                  <span className="text-muted-foreground/70">{c.toLowerCase()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {SEMANTIC_ORDER.some((k) => core.semantic[k]) ? (
          <>
            <div className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Semantic · functional accessory</div>
            <div className="flex gap-2">
              {SEMANTIC_ORDER.filter((k) => core.semantic[k]).map((k) => (
                <div key={k} className={`flex flex-1 items-center gap-2 rounded-[2px] px-2 py-1.5 ${CHIP}`}>
                  <span className="h-4 w-4 rounded-[1px]" style={{ background: core.semantic[k] }} />
                  <span className="font-mono text-[10px] lowercase text-muted-foreground">{k}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {rampHexes(ramps.accent).length || rampHexes(ramps.neutral).length ? (
          <>
            <div className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Ramps</div>
            <div className="space-y-1.5">
              {(["accent", "neutral"] as const).map((r) => {
                const hexes = rampHexes(ramps[r]);
                return hexes.length ? (
                  <div key={r} className="flex items-center gap-2">
                    <span className="w-14 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{r}</span>
                    <div className="flex h-5 flex-1 overflow-hidden rounded-[2px]">
                      {hexes.map((hex, i) => (
                        <span key={i} className="h-full flex-1" style={{ background: hex }} />
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </>
        ) : null}

        <Perforation className="my-4" />
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={tokensCss} label="Copy tokens.css" variant="ink" artifact="tokens_css" />
          <a
            href={`data:text/css;charset=utf-8,${encodeURIComponent(tokensCss)}`}
            download={`${slug}.tokens.css`}
            className={KX_BTN_PAPER}
          >
            Download .css
          </a>
          {tags.length > 0 ? (
            <span className="ml-auto flex flex-wrap gap-x-3 gap-y-1">
              {tags.slice(0, 5).map((t) => (
                <span key={t} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">{t}</span>
              ))}
            </span>
          ) : null}
        </div>
      </StickyNote>

      <Credits raw={f.credits} />

      <ModelProvenance raw={f.model_provenance} />

      {guidance && (guidance.do?.length || guidance.dont?.length) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {guidance.do?.length ? (
            <StickyNote tint="matcha" className="p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--matcha), black 35%)" }}>Do</div>
              <ul className="space-y-1.5 text-[13px] text-foreground">{guidance.do.map((d, i) => <li key={i}>· {d}</li>)}</ul>
            </StickyNote>
          ) : null}
          {guidance.dont?.length ? (
            <StickyNote tint="sakura" className="p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--beni), black 10%)" }}>Don&apos;t</div>
              <ul className="space-y-1.5 text-[13px] text-foreground">{guidance.dont.map((d, i) => <li key={i}>· {d}</li>)}</ul>
            </StickyNote>
          ) : null}
        </div>
      ) : null}

      {/* remix hook */}
      <section>
        <SectionHeading eyebrow="try it" eyebrowColor="graphite">
          remix with this palette
        </SectionHeading>
        <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Drop <span className="text-foreground">{name}</span> onto any UI language and swap the art style — the preview recolors live.
        </p>
        {langOpts.length && palOpts.length && artOpts.length ? (
          <InlineRemix
            languages={langOpts}
            palettes={palOpts}
            art={artOpts}
            fixed={{ palette: id }}
          />
        ) : (
          <div className="sticker-card p-5 text-sm text-muted-foreground">
            Needs a Published language and art style to remix.
          </div>
        )}
      </section>
    </div>
  );
}
