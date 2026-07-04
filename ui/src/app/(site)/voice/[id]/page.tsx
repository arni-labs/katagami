import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWritingStyle, getFileUrl, parseJson } from "@/lib/odata";
import { PageHero } from "@/components/page-hero";
import { StickyNote, SectionHeading, Stamp, Perforation } from "@/components/scrapbook";
import { CopyButton } from "@/components/copy-button";
import { Credits } from "@/components/credits";
import { ModelProvenance } from "@/components/model-provenance";

export const dynamic = "force-dynamic";

const CHIP = "bg-[color-mix(in_srgb,var(--foreground)_4%,var(--card))]";

const BASIS_LABEL: Record<string, string> = {
  opt_in: "consented voice",
  public_domain: "public domain",
  original: "original register",
};

function cellText(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

interface Exemplar {
  text?: string;
  annotation?: string;
  kind?: string;
}

export default async function VoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let ws;
  try {
    ws = await getWritingStyle(id);
  } catch {
    notFound();
  }
  const f = ws.fields;
  const name = f.name ?? "Untitled voice";
  const persona = f.persona ?? "";
  const tone = parseJson<Record<string, unknown>>(f.tone_scales) ?? {};
  const vocabulary =
    parseJson<{ use?: string[]; ban?: string[] }>(f.vocabulary) ?? {};
  const moves = parseJson<string[]>(f.moves) ?? [];
  const register = parseJson<Record<string, unknown>>(f.register) ?? {};
  const refusals = parseJson<string[]>(f.refusals) ?? [];
  const bands = parseJson<Record<string, unknown>>(f.mechanical_bands) ?? {};
  const exemplars = parseJson<Exemplar[]>(f.exemplars) ?? [];
  const consent =
    parseJson<{
      basis?: string;
      author?: string;
      license?: string;
      samples?: number;
      provenance?: string;
    }>(f.consent) ?? {};
  const tags = parseJson<string[]>(f.tags) ?? [];
  const voiceMdUrl =
    (f.voice_md_asset_url ?? "").trim() ||
    (f.voice_md_file_id ? getFileUrl(f.voice_md_file_id) : "");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:py-10">
      <Link
        href="/voice"
        className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
        back to voices
      </Link>

      <PageHero
        eyebrow="Voice lane"
        eyebrowAccent="matcha"
        title={
          <span className="relative inline-block">
            {name}
            <span
              aria-hidden
              className="absolute -bottom-1.5 left-0 h-[3px] w-12 rounded-[2px]"
              style={{ background: "var(--matcha)" }}
            />
          </span>
        }
        description={persona || "A verifiable, consent-clean voice contract."}
        rightSlot={
          <Stamp color="matcha">
            {BASIS_LABEL[consent.basis ?? ""] ?? "voice"}
          </Stamp>
        }
      />

      {/* The refusals lead — taste is what you reject. */}
      {refusals.length ? (
        <StickyNote tint="sakura" className="p-5 sm:p-6">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Never
          </div>
          <ul className="space-y-2">
            {refusals.map((r, i) => (
              <li
                key={i}
                className="text-[17px] leading-relaxed text-foreground"
              >
                {r}
              </li>
            ))}
          </ul>
        </StickyNote>
      ) : null}

      {/* Tone + vocabulary + moves + register */}
      <StickyNote className="p-5 sm:p-6">
        {Object.keys(tone).length ? (
          <>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Tone — numbered, not adjectives
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(tone).map(([k, v]) => (
                <span
                  key={k}
                  className={`rounded-[3px] px-2.5 py-1.5 font-mono text-[12px] text-foreground ${CHIP}`}
                >
                  {k} · {cellText(v)}
                  {typeof v === "number" ? "/10" : ""}
                </span>
              ))}
            </div>
          </>
        ) : null}
        {vocabulary.use?.length || vocabulary.ban?.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {vocabulary.use?.length ? (
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Use
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vocabulary.use.map((w) => (
                    <span
                      key={w}
                      className={`rounded-[9999px] px-3 py-1 text-[13px] text-foreground ${CHIP}`}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {vocabulary.ban?.length ? (
              <div>
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Ban
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vocabulary.ban.map((w) => (
                    <span
                      key={w}
                      className="rounded-[9999px] px-3 py-1 text-[13px] text-muted-foreground line-through"
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {moves.length ? (
          <>
            <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Moves
            </div>
            <ul className="space-y-1.5 text-[14px] text-foreground">
              {moves.map((m, i) => (
                <li key={i}>· {cellText(m)}</li>
              ))}
            </ul>
          </>
        ) : null}
        {Object.keys(register).length ? (
          <>
            <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Register by channel
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {Object.entries(register).map(([k, v]) => (
                <div
                  key={k}
                  className={`rounded-[3px] px-2.5 py-1.5 text-[13px] text-foreground ${CHIP}`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {k}
                  </span>{" "}
                  — {cellText(v)}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </StickyNote>

      {/* The checkable core */}
      <StickyNote tint="matcha" className="p-5 sm:p-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Mechanical bands — checked at publish
        </div>
        <p className="mb-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
          Deterministic constraints derived from this voice&apos;s own corpus.
          The curation finalizer re-runs them over every corpus file and
          exemplar before this voice can publish — a contract its own corpus
          cannot pass does not ship.
        </p>
        <pre
          className={`overflow-x-auto rounded-[3px] p-3 font-mono text-[12px] leading-relaxed text-foreground ${CHIP}`}
        >
          {JSON.stringify(bands, null, 2)}
        </pre>
        <Perforation className="my-4" />
        <div className="flex flex-wrap items-center gap-2">
          {voiceMdUrl ? (
            <a
              href={voiceMdUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-[9999px] bg-foreground px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-background transition-opacity hover:opacity-85"
            >
              Open VOICE.md
            </a>
          ) : null}
          <CopyButton
            text={JSON.stringify(bands, null, 2)}
            label="Copy bands"
            artifact="voice-bands"
          />
          {tags.length ? (
            <span className="ml-auto flex flex-wrap gap-x-3 gap-y-1">
              {tags.slice(0, 5).map((t) => (
                <span
                  key={t}
                  className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80"
                >
                  {t}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </StickyNote>

      {/* Annotated exemplars — the gap is the voice */}
      {exemplars.length ? (
        <section>
          <SectionHeading eyebrow="ground truth" eyebrowColor="matcha">
            annotated examples
          </SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exemplars.map((ex, i) => (
              <StickyNote key={i} className="p-4">
                <p className="text-[15px] leading-relaxed text-foreground">
                  &ldquo;{ex.text}&rdquo;
                </p>
                {ex.annotation ? (
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {ex.annotation}
                    {ex.kind ? ` · ${ex.kind}` : ""}
                  </p>
                ) : null}
              </StickyNote>
            ))}
          </div>
        </section>
      ) : null}

      {/* Consent — first-class, not a policy page */}
      <StickyNote className="p-5 sm:p-6">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Corpus consent
        </div>
        <div className="grid gap-1.5 text-[14px] text-foreground sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">basis</span> —{" "}
            {BASIS_LABEL[consent.basis ?? ""] ?? consent.basis ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">author</span> —{" "}
            {consent.author ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">license</span> —{" "}
            {consent.license ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">samples</span> —{" "}
            {consent.samples ?? "—"}
          </div>
        </div>
        {consent.provenance ? (
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {consent.provenance}
          </p>
        ) : null}
      </StickyNote>

      <Credits raw={f.credits} />
      <ModelProvenance raw={f.model_provenance} />
    </div>
  );
}
