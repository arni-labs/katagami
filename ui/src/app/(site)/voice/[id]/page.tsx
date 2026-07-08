import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getWritingStyle, getFileUrl, getFileText, parseJson } from "@/lib/odata";
import { voiceComposition } from "@/lib/lane-items";
import { isOwner } from "@/lib/owner";
import { PageHero } from "@/components/page-hero";
import { StickyNote, SectionHeading, Stamp, Perforation } from "@/components/scrapbook";
import { CopyButton } from "@/components/copy-button";
import { Credits } from "@/components/credits";
import { ModelProvenance } from "@/components/model-provenance";
import { PublishVoiceButton } from "@/components/publish-voice-button";

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
  if (!(await isOwner())) notFound();
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
  const corpusIds = parseJson<string[]>(f.corpus_file_ids) ?? [];
  const manifest =
    parseJson<{ items?: Array<{ file_id?: string; source?: string; kind?: string }> }>(
      f.corpus_manifest,
    ) ?? {};
  const sourceByFile = new Map(
    (manifest.items ?? []).map((it) => [it.file_id ?? "", it.source ?? it.kind ?? ""]),
  );
  // The corpus IS the style artifact — fetch it and show real long-form prose.
  // Cap the render per excerpt at a paragraph boundary near 1500 chars.
  const excerpts = (
    await Promise.all(
      corpusIds.slice(0, 6).map(async (fid) => {
        const body = (await getFileText(fid)).trim();
        if (!body) return null;
        let cut = body;
        if (body.length > 1600) {
          const at = body.lastIndexOf("\n\n", 1500);
          cut = body.slice(0, at > 400 ? at : 1500);
        }
        return { source: sourceByFile.get(fid) ?? "", text: cut, truncated: cut.length < body.length };
      }),
    )
  ).filter((e): e is { source: string; text: string; truncated: boolean } => e !== null);
  const parentIds = parseJson<string[]>(f.parent_ids) ?? [];
  const parents = (
    await Promise.all(
      parentIds.slice(0, 4).map(async (pid) => {
        try {
          const p = await getWritingStyle(pid);
          return { id: pid, name: p.fields.name ?? pid };
        } catch {
          return null;
        }
      }),
    )
  ).filter((p): p is { id: string; name: string } => p !== null);
  const replicationIds = parseJson<string[]>(f.replication_sample_file_ids) ?? [];
  const replicationManifest =
    parseJson<{ items?: Array<{ file_id?: string; model?: string; loop?: string; generated_at?: string }> }>(
      f.replication_manifest,
    ) ?? {};
  const replicaProvenance = new Map(
    (replicationManifest.items ?? []).map((it) => [
      it.file_id ?? "",
      [it.model, it.generated_at, it.loop ? `loop ${it.loop}` : ""].filter(Boolean).join(" · "),
    ]),
  );
  const modelByFile = new Map(
    (replicationManifest.items ?? []).map((it) => [it.file_id ?? "", it.model ?? ""]),
  );
  const replications = (
    await Promise.all(
      replicationIds.slice(0, 3).map(async (fid) => {
        const body = (await getFileText(fid)).trim();
        return body
          ? {
              model: modelByFile.get(fid) ?? "unknown model",
              provenance: replicaProvenance.get(fid) ?? "",
              text: body,
            }
          : null;
      }),
    )
  ).filter((r): r is { model: string; text: string } => r !== null);
  const rawReport = parseJson<{
    engine?: string;
    texts?: Record<string, number>;
    checks_passed?: string[];
    compliance?: { checks_passed?: string[] };
    imitation_evidence?: { style_similarity?: unknown; attribution_for_next_revision?: string[] };
    replication?: { models?: string[] };
  }>(f.verification_report);
  const verificationReport = rawReport
    ? {
        engine: rawReport.engine,
        texts: rawReport.texts,
        checks_passed: rawReport.compliance?.checks_passed ?? rawReport.checks_passed,
        replication: rawReport.replication,
      }
    : undefined;
  const voiceMdBody = f.voice_md_file_id ? (await getFileText(f.voice_md_file_id)).trim() : "";
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
          <Stamp color={ws.status === "Published" ? "matcha" : "yuzu"}>
            {ws.status === "Published"
              ? (BASIS_LABEL[consent.basis ?? ""] ?? "voice")
              : "under review"}
          </Stamp>
        }
      />

      {ws.status === "UnderReview" ? (
        <StickyNote tint="yuzu" className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[14px] leading-relaxed text-foreground">
              Mechanics verified by the finalizer; taste is yours. Publishing
              is one click once this voice reads right.
            </p>
            <span className="ml-auto">
              <PublishVoiceButton id={id} />
            </span>
          </div>
        </StickyNote>
      ) : null}

      {voiceComposition(f.credits, consent.basis ?? "") || parents.length ? (
        <div className="space-y-1.5">
          {voiceComposition(f.credits, consent.basis ?? "") ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {voiceComposition(f.credits, consent.basis ?? "")}
            </p>
          ) : null}
          {parents.length ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              lineage:{" "}
              {parents.map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? " + " : ""}
                  <Link href={`/voice/${p.id}`} className="text-foreground underline decoration-dotted underline-offset-4">
                    {p.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      {exemplars[0]?.text ? (
        <blockquote
          className="max-w-3xl text-[24px] font-medium leading-snug text-foreground sm:text-[28px]"
          style={{ letterSpacing: "-0.02em" }}
        >
          &ldquo;{exemplars[0].text}&rdquo;
          {exemplars[0].annotation ? (
            <footer className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {exemplars[0].annotation}
            </footer>
          ) : null}
        </blockquote>
      ) : null}

      {/* Tone + vocabulary + moves + register */}
      <StickyNote className="p-5 sm:p-6">
        {vocabulary.use?.length || vocabulary.ban?.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
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
        {refusals.length ? (
          <>
            <div className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Never — the anti-prompt
            </div>
            <ul className="space-y-1.5 text-[14px] text-foreground">
              {refusals.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
          </>
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

      {excerpts.length || exemplars.length > 1 ? (
        <section>
          <SectionHeading eyebrow="the artifact" eyebrowColor="matcha">
            how it reads
          </SectionHeading>
          <p className="mb-5 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            The corpus this contract was derived from — real passages at
            length, the same files the checker measures. Style lives in the
            construction, in how the sentences move.
          </p>
          {exemplars.length > 1 ? (
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              {exemplars.slice(1).map((ex, i) => (
                <StickyNote key={i} className="p-4">
                  <p className="text-[16px] leading-relaxed text-foreground">
                    &ldquo;{ex.text}&rdquo;
                  </p>
                  {ex.annotation ? (
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                      {ex.annotation}
                    </p>
                  ) : null}
                </StickyNote>
              ))}
            </div>
          ) : null}
          <div className="space-y-4">
            {excerpts.map((ex, i) => (
              <StickyNote key={i} className="p-5 sm:p-6">
                <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {ex.source || `corpus excerpt ${i + 1}`}
                </div>
                <div className="max-w-3xl space-y-4 text-[17px] leading-relaxed text-foreground">
                  {ex.text.split(/\n\n+/).map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
                {ex.truncated ? (
                  <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70">
                    excerpt — the full file is in the corpus
                  </div>
                ) : null}
              </StickyNote>
            ))}
          </div>
        </section>
      ) : null}

      {/* The round-trip proof: an LLM given only the VOICE.md wrote these. */}
      {replications.length ? (
        <section>
          <SectionHeading eyebrow="round-trip proof" eyebrowColor="graphite">
            replicated from the contract
          </SectionHeading>
          <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            These passages were produced by an LLM given the VOICE.md alone —
            no corpus, no other context. They are replicas, never the
            author&apos;s text, and each one passed this voice&apos;s own
            mechanical bands: the contract provably works as a prompt.
          </p>
          <div className="space-y-4">
            {replications.map((r, i) => (
              <StickyNote key={i} className="p-5 sm:p-6">
                <div className="mb-3 flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    replica — {r.provenance || r.model}
                  </span>
                  <span className="rounded-[9999px] bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    passed the bands
                  </span>
                </div>
                <div className="max-w-3xl space-y-4 text-[16px] leading-relaxed text-foreground/90">
                  {r.text.split(/\n\n+/).slice(0, 4).map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </StickyNote>
            ))}
          </div>
        </section>
      ) : null}

      {/* What was actually verified — the finalizer's record. */}
      {verificationReport ? (
        <StickyNote tint="matcha" className="p-5 sm:p-6">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Verification record
          </div>
          <p className="mb-3 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            {verificationReport.engine ?? "deterministic checks"} — written by
            the finalizer at verification time.
          </p>
          {verificationReport.texts ? (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {Object.entries(verificationReport.texts).map(([k, v]) => (
                <span key={k} className={`rounded-[3px] px-2.5 py-1.5 font-mono text-[11px] text-foreground ${CHIP}`}>
                  {k.replaceAll("_", " ")} · {v}
                </span>
              ))}
            </div>
          ) : null}
          {verificationReport.checks_passed?.length ? (
            <ul className="grid gap-1 text-[13px] text-foreground sm:grid-cols-2">
              {verificationReport.checks_passed.map((c) => (
                <li key={c}>· {c.replaceAll("_", " ")}</li>
              ))}
            </ul>
          ) : null}
        </StickyNote>
      ) : null}

      {/* The portable artifact itself. */}
      {voiceMdBody ? (
        <section>
          <SectionHeading eyebrow="the artifact" eyebrowColor="graphite">
            VOICE.md
          </SectionHeading>
          <p className="mb-4 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            The portable contract file — what an agent or a person receives
            when they use this voice. The replication above was produced from
            exactly this text.
          </p>
          <pre className={`max-h-[480px] overflow-auto whitespace-pre-wrap rounded-[16px] p-4 font-mono text-[12.5px] leading-relaxed text-foreground ${CHIP}`}>{voiceMdBody}</pre>
        </section>
      ) : null}

      {/* Consent — first-class page content */}
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
