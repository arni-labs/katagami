import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  artStyleDisplayName,
  getArtStyle,
  listDesignLanguages,
  listPaletteSystems,
  getFileUrl,
  parseJson,
} from "@/lib/odata";
import { toLanguageOpts, toPaletteOpts, toArtOpts } from "@/lib/remix-options";
import { PageHero } from "@/components/page-hero";
import { StickyNote, SectionHeading, Stamp, Perforation } from "@/components/scrapbook";
import { CopyButton } from "@/components/copy-button";
import { Credits } from "@/components/credits";
import { ModelProvenance } from "@/components/model-provenance";
import { InlineRemix } from "@/components/remix/inline-remix";

export const dynamic = "force-dynamic";

const CHIP = "bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))]";

function refUrls(raw?: string): string[] {
  const ids = parseJson<string[]>(raw);
  return Array.isArray(ids) ? ids.map((id) => getFileUrl(id)) : [];
}

/** Render a parsed-JSON value as text. These maps are typed as string values,
 *  but contributor-submitted data can carry nested objects/arrays — handing a
 *  raw object to JSX throws "Objects are not valid as a React child" and 500s
 *  the page. Coerce so malformed data degrades to readable text instead. */
function cellText(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

export default async function ArtStyleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let art;
  try {
    art = await getArtStyle(id);
  } catch {
    notFound();
  }
  const f = art.fields;
  const name = artStyleDisplayName(f);
  const medium = f.medium ?? "mixed";
  const promptTemplate = f.prompt_template ?? "";
  const negativePrompt = f.negative_prompt ?? "";
  const engineHints = parseJson<Record<string, unknown>>(f.engine_hints) ?? {};
  const slotRecipes = parseJson<Record<string, unknown>>(f.slot_recipes) ?? {};
  const guidance = parseJson<{ do?: string[]; dont?: string[] }>(f.guidance);
  const tags = parseJson<string[]>(f.tags) ?? [];

  const refs = refUrls(f.reference_image_file_ids);
  const proofs = refUrls(f.proof_shots_file_ids);
  const thumb = f.thumbnail_file_id ? getFileUrl(f.thumbnail_file_id) : "";
  const hero = refs[0] || thumb || "";
  const gallery = (proofs.length ? proofs : refs.slice(1)).filter((s) => s && s !== hero);

  const recipe =
    `${name} — Katagami art-style recipe (${medium})\n\n` +
    `PROMPT TEMPLATE\n${promptTemplate}\n\n` +
    (negativePrompt ? `NEGATIVE\n${negativePrompt}\n\n` : "") +
    (Object.keys(engineHints).length
      ? `ENGINE HINTS\n${Object.entries(engineHints).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\n`
      : "") +
    `Fill {subject} from your composition's image slot and {palette} from a palette system, then generate with any engine.`;

  const [languages, palettes] = await Promise.all([
    listDesignLanguages("Status eq 'Published'").catch(() => []),
    listPaletteSystems().catch(() => []),
  ]);
  const artOpts = toArtOpts([art]);
  const langOpts = toLanguageOpts(languages);
  const palOpts = toPaletteOpts(palettes);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:py-10">
      <Link
        href="/art-styles"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to art styles
      </Link>

      <PageHero
        eyebrow="Art lane"
        eyebrowAccent="graphite"
        title={
          <span className="relative inline-block">
            {name}
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-0 h-[3px] w-12 rounded-[2px]"
              style={{ background: "var(--graphite)" }}
            />
          </span>
        }
        description="An engine-agnostic style recipe: a wide hero, proof shots across subjects, and a portable subject/palette prompt."
        rightSlot={<Stamp color="sakura">{medium}</Stamp>}
      />

      {/* hero + proof gallery */}
      <StickyNote tint="sakura" className="p-3">
        <div className="overflow-hidden rounded-[2px] bg-muted" style={{ aspectRatio: "16/9" }}>
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={`${name} hero`} className="h-full w-full object-cover" />
          ) : null}
        </div>
        {gallery.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {gallery.slice(0, 3).map((src, i) => (
              <div key={i} className="overflow-hidden rounded-[2px] bg-muted" style={{ aspectRatio: "1/1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${name} proof ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-2 px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
          1 hero · {gallery.length} proof{gallery.length === 1 ? "" : "s"}
        </div>
      </StickyNote>

      {/* recipe */}
      <StickyNote className="p-5 sm:p-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Prompt template</div>
        <pre className={`overflow-x-auto whitespace-pre-wrap rounded-[3px] p-3 font-mono text-[12px] leading-relaxed text-foreground ${CHIP}`}>{promptTemplate}</pre>
        {negativePrompt ? (
          <>
            <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Negative prompt</div>
            <pre className={`overflow-x-auto whitespace-pre-wrap rounded-[3px] p-3 font-mono text-[12px] leading-relaxed text-muted-foreground ${CHIP}`}>{negativePrompt}</pre>
          </>
        ) : null}
        {Object.keys(slotRecipes).length ? (
          <>
            <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Slot recipes</div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(slotRecipes).map(([k, v]) => (
                <div key={k} className={`rounded-[3px] px-2.5 py-1.5 text-[12px] text-foreground ${CHIP}`}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{k}</span> — {cellText(v)}
                </div>
              ))}
            </div>
          </>
        ) : null}
        {Object.keys(engineHints).length ? (
          <>
            <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Engine hints</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(engineHints).map(([k, v]) => (
                <span key={k} className="rounded-[2px] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                  <span className="text-foreground">{k}</span> · {cellText(v)}
                </span>
              ))}
            </div>
          </>
        ) : null}
        <Perforation className="my-4" />
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton text={recipe} label="Copy recipe" variant="ink" artifact="recipe" />
          <CopyButton text={promptTemplate} label="Copy prompt only" artifact="prompt" />
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
          remix with this style
        </SectionHeading>
        <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
          Apply <span className="text-foreground">{name}</span> to any UI language and swap the palette — the preview takes this style&apos;s hero image.
        </p>
        {langOpts.length && palOpts.length && artOpts.length ? (
          <InlineRemix
            languages={langOpts}
            palettes={palOpts}
            art={artOpts}
            fixed={{ art: id }}
            variant="drawer"
          />
        ) : (
          <div className="sticker-card p-5 text-sm text-muted-foreground">
            Needs a Published language and palette to remix.
          </div>
        )}
      </section>
    </div>
  );
}
