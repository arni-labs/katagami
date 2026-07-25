import { notFound } from "next/navigation";
import { isOwner } from "@/lib/owner";
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
import { ArtStyleEvidence } from "@/components/art-style-evidence";
import { InlineRemix } from "@/components/remix/inline-remix";
import {
  artStylePromptLabel,
  artStylePromptState,
} from "@/lib/art-style-prompt-state";

export const dynamic = "force-dynamic";

const CHIP = "bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))]";

function refUrls(raw?: string): string[] {
  const ids = parseJson<string[]>(raw);
  return Array.isArray(ids) ? ids.map((id) => getFileUrl(id)) : [];
}

// Build image URLs from File ids -> /api/file proxy (reliable). Avoid
// reference_assets VALUES (some are assets.katagami.ai CDN urls that 404) and
// the guard-limited reference_image_file_ids; collect ids from the manifest
// (full set), the reference_assets KEYS (file ids), and the id field.
function refImageUrls(fields: Record<string, string | undefined>): string[] {
  const ids: string[] = [];
  const add = (id: unknown) => {
    if (typeof id === "string" && id.startsWith("fl-") && !ids.includes(id)) ids.push(id);
  };
  const manifest = parseJson<{ items?: Array<{ file?: string; file_id?: string }>; references?: Array<{ file?: string; file_id?: string }> }>(fields.reference_manifest);
  (manifest?.items ?? manifest?.references ?? []).forEach((it) => add(it?.file_id ?? it?.file));
  const assets = parseJson<Record<string, unknown>>(fields.reference_assets);
  if (assets && typeof assets === "object" && !Array.isArray(assets)) Object.keys(assets).forEach(add);
  (parseJson<string[]>(fields.reference_image_file_ids) ?? []).forEach(add);
  return ids.map((id) => getFileUrl(id));
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
  // Non-published entries are the curator's queue: owner sees them (preview),
  // everyone else gets a 404. The owner check runs ONLY on this branch, so
  // Published renders never touch cookies() and stay cacheable.
  const isPublished = art.status === "Published";
  const ownerPreview = !isPublished && (await isOwner());
  if (!isPublished && !ownerPreview) notFound();

  const f = art.fields;
  const name = artStyleDisplayName(f);
  const medium = f.medium ?? "mixed";
  const promptTemplate = f.prompt_template ?? "";
  const portability = parseJson<{ verdict?: string }>(f.portability_report);
  const promptVerified =
    f.has_source_basis_review === "true" &&
    f.has_prompt_review === "true" &&
    f.has_portability_evidence === "true" &&
    portability?.verdict === "pass";
  const promptState = artStylePromptState(art.status, promptVerified);
  const slotRecipes = parseJson<Record<string, unknown>>(f.slot_recipes) ?? {};
  const guidance = parseJson<{ do?: string[]; dont?: string[] }>(f.guidance);
  const tags = parseJson<string[]>(f.tags) ?? [];

  const refs = refImageUrls(f);
  const proofs = refUrls(f.proof_shots_file_ids);
  const thumb = f.thumbnail_file_id ? getFileUrl(f.thumbnail_file_id) : "";
  const hero = proofs[0] || refs[0] || thumb || "";
  const gallery = [...proofs.slice(1), ...refs].filter(
    (src, index, all) => src && src !== hero && all.indexOf(src) === index,
  );

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
              className="absolute -bottom-1.5 left-0 h-[3px] w-12"
              style={{ background: "var(--graphite)" }}
            />
          </span>
        }
        description={
          promptState === "verified"
            ? "One reference-independent aesthetic prompt, with per-model evidence showing how consistently it transforms unrelated subjects."
            : promptState === "published-legacy"
              ? "A published art-style recipe whose cross-model portability evidence is still being backfilled."
              : "A private owner preview for reviewing the prompt and its portability evidence before publication."
        }
        rightSlot={<Stamp color="sakura">{medium}</Stamp>}
      />

      {ownerPreview ? (
        <div className="rounded-2xl bg-[color-mix(in_srgb,var(--sakura)_18%,var(--card))] px-4 py-3 text-[17px] text-foreground">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Owner preview · Under review · Not public
          </span>
        </div>
      ) : null}

      {/* hero + proof gallery */}
      <StickyNote tint="sakura" className="p-3">
        <div className="overflow-hidden bg-muted" style={{ aspectRatio: "16/9" }}>
          {hero ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt={`${name} hero`} className="h-full w-full object-cover" />
          ) : null}
        </div>
        {gallery.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {gallery.slice(0, 3).map((src, i) => (
              <div key={i} className="overflow-hidden bg-muted" style={{ aspectRatio: "1/1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${name} proof ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-2 px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
          1 hero · {Math.max(0, proofs.length - 1)} more proof{proofs.length === 2 ? "" : "s"}
          {refs.length ? ` · ${refs.length} optional example${refs.length === 1 ? "" : "s"}` : ""}
        </div>
      </StickyNote>

      {/* Keep the existing published commons usable while its evidence is
          backfilled. New records still cannot publish without the verified
          evidence gate enforced by Temper. */}
      {promptTemplate ? (
        <StickyNote className="p-5 sm:p-6">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {artStylePromptLabel(promptState)}
          </div>
          <pre className={`overflow-x-auto whitespace-pre-wrap rounded-2xl p-4 font-mono text-[17px] leading-relaxed text-foreground ${CHIP}`}>{promptTemplate}</pre>
          {Object.keys(slotRecipes).length ? (
            <>
              <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Slot recipes</div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {Object.entries(slotRecipes).map(([k, v]) => (
                  <div key={k} className={`rounded-2xl px-3 py-2 text-[17px] text-foreground ${CHIP}`}>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{k}</span> — {cellText(v)}
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <Perforation className="my-4" />
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={promptTemplate} label="Copy prompt" variant="ink" artifact="prompt" />
            {tags.length > 0 ? (
              <span className="ml-auto flex flex-wrap gap-x-3 gap-y-1">
                {tags.slice(0, 5).map((t) => (
                  <span key={t} className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80">{t}</span>
                ))}
              </span>
            ) : null}
          </div>
          {promptState === "published-legacy" ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              This published catalog prompt remains available while its source-basis and cross-model portability evidence are backfilled.
            </p>
          ) : promptState === "owner-review" ? (
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Private review copy. Publication remains blocked until its source-basis, prompt, and cross-model evidence all pass.
            </p>
          ) : null}
        </StickyNote>
      ) : (
        <StickyNote className="p-5 sm:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Prompt unavailable</div>
          <p className="mt-2 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            This record does not contain a prompt yet.
          </p>
        </StickyNote>
      )}

      <ArtStyleEvidence
        portabilityRaw={f.portability_report}
        promptReviewRaw={f.prompt_review}
        sourceBasisRaw={f.source_basis}
        attested={promptVerified}
      />

      <Credits raw={f.credits} />

      <ModelProvenance raw={f.model_provenance} />

      {guidance && (guidance.do?.length || guidance.dont?.length) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {guidance.do?.length ? (
            <StickyNote tint="matcha" className="p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--matcha), black 35%)" }}>Do</div>
              <ul className="space-y-1.5 text-[17px] text-foreground">{guidance.do.map((d, i) => <li key={i}>· {d}</li>)}</ul>
            </StickyNote>
          ) : null}
          {guidance.dont?.length ? (
            <StickyNote tint="sakura" className="p-4">
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "color-mix(in oklch, var(--beni), black 10%)" }}>Don&apos;t</div>
              <ul className="space-y-1.5 text-[17px] text-foreground">{guidance.dont.map((d, i) => <li key={i}>· {d}</li>)}</ul>
            </StickyNote>
          ) : null}
        </div>
      ) : null}

      {/* remix hook */}
      <section>
        <SectionHeading eyebrow="try it" eyebrowColor="graphite">
          remix with this style
        </SectionHeading>
        <p className="mb-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
          Apply <span className="text-foreground">{name}</span> to any UI language and palette. The prompt is primary; attached images are optional examples.
        </p>
        {(promptVerified || isPublished) && langOpts.length && palOpts.length && artOpts.length ? (
          <InlineRemix
            languages={langOpts}
            palettes={palOpts}
            art={artOpts}
            fixed={{ art: id }}
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
