import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { getWritingStyle, getFileText, getFileUrl } from "@/lib/odata";
import { loadWritingStyleCellIndex, type WritingStyleCellLink } from "@/lib/encyclopedia";
import { isOwner } from "@/lib/owner";
import { labPreviewAllowed } from "@/lib/lab-preview";
import {
  agentHandoff,
  bandSentences,
  corpusManifestOf,
  parentIdsOf,
  replicationManifestOf,
  toWritingStyleDetail,
  BASIS_LABEL,
  creditLine,
  type WritingStyleDetail,
} from "@/lib/writing-styles";
import { InkStamp, StatusStamp } from "@/components/encyclopedia/chrome";
import { BulletList, CellLinks, CreditsList, KeyValueTable, Passage, Section, TagChips } from "@/components/writing/parts";
import { AgentHandoff, Folded } from "@/components/writing/handoff";
import { ModelProvenance } from "@/components/model-provenance";
import { PublishVoiceButton } from "@/components/publish-voice-button";

// One writing style, whole. The listing at /writing opens on a passage and
// stops there; this is where the passage's evidence lives — every exemplar at
// full length, the corpus files the contract was measured from with their
// sources and word counts, the bands, the replicas, and the VOICE.md an agent
// is handed. Same gate as the listing, since it is the same material.

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Writing style — Katagami",
  robots: { index: false, follow: false },
};

const SITE = "https://katagami.ai";

/** The corpus and replica files, read in one pass so the page renders once. */
async function readFiles(ids: string[]): Promise<Map<string, string>> {
  const texts = await Promise.all(ids.map(async (id) => [id, (await getFileText(id)).trim()] as const));
  return new Map(texts.filter(([, text]) => text));
}

function ScaleRow({ label, value }: { label: string; value: string }) {
  const n = Number(value);
  const share = Number.isFinite(n) && n >= 0 && n <= 10 ? n / 10 : null;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label.replace(/[_-]+/g, " ")}</span>
      {share === null ? null : (
        <span aria-hidden className="h-2 flex-1 bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]">
          <span className="block h-2" style={{ width: `${share * 100}%`, background: "var(--ramune)" }} />
        </span>
      )}
      <span className="w-10 shrink-0 text-right text-[17px] font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export default async function WritingStyleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isOwner()) && !labPreviewAllowed()) notFound();
  const { id } = await params;
  let row;
  try {
    row = await getWritingStyle(id);
  } catch {
    notFound();
  }

  const corpusIds = corpusManifestOf(row).map((item) => item.fileId);
  const replicationIds = replicationManifestOf(row).map((item) => item.fileId);
  const parentIds = parentIdsOf(row);

  const [corpus, replications, voiceMd, cellIndex, parents] = await Promise.all([
    readFiles(corpusIds),
    readFiles(replicationIds),
    row.fields.voice_md_file_id ? getFileText(row.fields.voice_md_file_id).then((t) => t.trim()) : Promise.resolve(""),
    // A cross-reference, not a dependency: which encyclopedia cells cite this
    // style is worth showing and is no reason for the style itself to fail.
    loadWritingStyleCellIndex().catch(() => new Map<string, WritingStyleCellLink[]>()),
    Promise.all(
      parentIds.slice(0, 4).map(async (pid) => {
        try {
          const parent = await getWritingStyle(pid);
          return { id: pid, name: parent.fields.name ?? pid };
        } catch {
          return null;
        }
      }),
    ).then((list) => list.filter((p): p is { id: string; name: string } => p !== null)),
  ]);

  const style: WritingStyleDetail = toWritingStyleDetail(row, cellIndex.get(row.entity_id) ?? [], {
    corpus,
    replications,
    voiceMd,
    parents,
  });
  const handoff = agentHandoff(style, `${SITE}/voice/${style.id}/VOICE.md`);
  const credit = creditLine(style);
  const basis = BASIS_LABEL[style.consentBasis] ?? style.consentBasis;
  const loadedCorpus = style.corpus.filter((item) => item.text);
  const describedCorpus = style.corpus.filter((item) => item.described);
  const sources = [...new Set(style.corpus.map((item) => item.source).filter(Boolean))];
  const lines = bandSentences(style.bandsJson);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24">
      <div className="pt-6 sm:pt-8">
        <Link
          href="/writing"
          className="group inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" aria-hidden />
          all writing styles
        </Link>
      </div>

      {/* ── Who this is ─────────────────────────────────────────────────── */}
      <header className="riso-reveal relative pt-7">
        <span aria-hidden className="halftone-wash -right-8 -top-2 hidden h-44 w-64 sm:block" style={{ ["--wash-ink" as string]: "var(--sakura)" }} />
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <StatusStamp status={style.status} />
          {basis ? <InkStamp ink="var(--ramune)" tilt={1}>{basis}</InkStamp> : null}
        </div>
        <h1 className="font-display text-[34px] font-bold leading-[1.04] tracking-[-0.03em] sm:text-[44px]">{style.name}</h1>
        {style.persona ? <p className="mt-4 max-w-2xl text-[19px] leading-[1.55] text-foreground">{style.persona}</p> : null}
        <div className="mt-4 space-y-1.5">
          {credit ? <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">{credit}</p> : null}
          {style.parents.length ? (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              after{" "}
              {style.parents.map((parent, i) => (
                <span key={parent.id}>
                  {i > 0 ? " + " : ""}
                  <Link href={`/writing/${parent.id}`} className="normal-case tracking-normal text-[17px] font-semibold text-foreground underline decoration-[var(--ramune)] decoration-2 underline-offset-[3px]">
                    {parent.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
          <CellLinks specimen={style} />
        </div>
        {style.tags.length ? <div className="mt-4"><TagChips tags={style.tags} /></div> : null}
        <span aria-hidden className="sticker-perforation mt-7 block" />
      </header>

      <div className="space-y-10 pt-9">
        {style.status === "UnderReview" ? (
          <div className="sticker-card flex flex-wrap items-center gap-4 p-5" style={{ ["--card-ink" as string]: "var(--yuzu)", background: "color-mix(in srgb, var(--yuzu) 9%, var(--paper-tint-base))" }}>
            <p className="max-w-xl text-[17px] leading-relaxed text-foreground">
              The mechanics are verified and the taste is yours. This voice publishes when it reads right to you.
            </p>
            <span className="ml-auto"><PublishVoiceButton id={style.id} /></span>
          </div>
        ) : null}

        {/* ── The point of the page: giving this voice to an agent ───────── */}
        {handoff ? (
          <AgentHandoff handoff={handoff} name={style.name} id={style.id} words={style.corpusWords} />
        ) : (
          <section className="sticker-card p-5 sm:p-6">
            <p className="text-[17px] leading-relaxed text-muted-foreground">
              This style has no VOICE.md on its record, so there is nothing to hand an agent yet. The corpus and the
              contract below are what a finalizer needs to write one.
            </p>
          </section>
        )}

        {/* ── The passages ──────────────────────────────────────────────── */}
        {style.exemplars.length ? (
          <Section eyebrow="passages" ink="var(--sakura)">
            <p className="mb-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
              {style.exemplars.length === 1 ? "The passage" : `The ${style.exemplars.length} passages`} the record keeps
              as this voice at its clearest. Quoted whole, exactly as they stand in the source.
            </p>
            <div className="grid gap-5">
              {style.exemplars.map((exemplar, i) => (
                <div key={i} className="sticker-card p-5 sm:p-6" style={{ ["--card-ink" as string]: "var(--sakura)" }}>
                  <Passage exemplar={exemplar} size="lg" />
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── The corpus: what the voice was actually measured from ─────── */}
        <Section eyebrow="the corpus" ink="var(--ramune)">
          <div className="mb-5 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <div className="font-display text-[34px] font-bold leading-none tracking-[-0.04em] tabular-nums">{style.corpus.length}</div>
              <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{style.corpus.length === 1 ? "file" : "files"}</div>
            </div>
            {style.corpusWords ? (
              <div>
                <div className="font-display text-[34px] font-bold leading-none tracking-[-0.04em] tabular-nums">{style.corpusWords.toLocaleString()}</div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {describedCorpus.length < style.corpus.length ? `words · across ${describedCorpus.length} of ${style.corpus.length}` : "words"}
                </div>
              </div>
            ) : null}
            {sources.length ? (
              <div>
                <div className="font-display text-[34px] font-bold leading-none tracking-[-0.04em] tabular-nums">{sources.length}</div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{sources.length === 1 ? "source" : "sources"}</div>
              </div>
            ) : null}
          </div>
          <p className="mb-6 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            {style.corpus.length
              ? "Every number in the contract below was measured over these files, and the finalizer re-runs the contract against them before this voice can publish. They are here in full."
              : "This record names no corpus files, so its contract has nothing behind it yet."}
            {style.consent.provenance ? ` ${style.consent.provenance}` : ""}
          </p>
          {style.corpus.length ? (
            <div className="grid gap-5">
              {style.corpus.map((item, i) => (
                <article key={item.fileId} className="sticker-card p-5 sm:p-6" style={{ ["--card-ink" as string]: "var(--ramune)" }}>
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <h3 className="text-[19px] font-semibold leading-snug text-foreground">{item.source || `Corpus file ${i + 1}`}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground tabular-nums">
                      {item.described
                        ? [item.words ? `${item.words.toLocaleString()} words` : "", item.kind.replace(/[_-]+/g, " ")].filter(Boolean).join(" · ")
                        : "not in the manifest"}
                    </span>
                  </div>
                  {item.text ? (
                    <Folded openLabel="Fold this file" closedLabel="Read the whole file" height={300}>
                      <div className="max-w-3xl space-y-4 text-[17px] leading-[1.62] text-foreground">
                        {item.text.split(/\n\n+/).map((paragraph, p) => (
                          <p key={p} className="whitespace-pre-line">{paragraph}</p>
                        ))}
                      </div>
                    </Folded>
                  ) : (
                    <p className="text-[17px] leading-relaxed text-muted-foreground">This file is on the record and its text could not be read just now.</p>
                  )}
                  <div className="mt-4">
                    <a
                      href={getFileUrl(item.fileId)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground underline decoration-[var(--ramune)] decoration-2 underline-offset-[3px] hover:text-foreground"
                    >
                      the file itself <ArrowUpRight size={12} aria-hidden />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {style.corpus.length && loadedCorpus.length < style.corpus.length ? (
            <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              {style.corpus.length - loadedCorpus.length} of {style.corpus.length} files could not be read
            </p>
          ) : null}
        </Section>

        {/* ── The voice layer ───────────────────────────────────────────── */}
        <Section eyebrow="the voice" ink="var(--sakura)">
          <div className="grid gap-5 sm:grid-cols-2">
            {Object.keys(style.toneScalesRaw).length ? (
              <div className="sticker-card p-5 sm:p-6">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tone, out of ten</div>
                <div className="grid gap-3">
                  {Object.entries(style.toneScalesRaw).map(([label, value]) => (
                    <ScaleRow key={label} label={label} value={value} />
                  ))}
                </div>
              </div>
            ) : null}
            {Object.keys(style.register).length ? (
              <div className="sticker-card p-5 sm:p-6">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Register by channel</div>
                <KeyValueTable rows={style.register} empty="No register recorded." />
              </div>
            ) : null}
            {style.moves.length ? (
              <div className="sticker-card p-5 sm:p-6">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">How it moves</div>
                <BulletList items={style.moves} empty="No moves recorded." />
              </div>
            ) : null}
            {style.vocabulary.use.length ? (
              <div className="sticker-card p-5 sm:p-6">
                <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Words it reaches for</div>
                <BulletList items={style.vocabulary.use} empty="None recorded." />
              </div>
            ) : null}
          </div>
          {/* The ban list runs to nine or more entries. As a column it makes a
              tall card beside a short one; wrapped, it reads as one gesture. */}
          {style.vocabulary.ban.length ? (
            <div className="sticker-card mt-5 p-5 sm:p-6">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Words it will not use</div>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {style.vocabulary.ban.map((word) => (
                  <li key={word} className="text-[17px] leading-relaxed text-muted-foreground line-through decoration-[var(--sakura)] decoration-2">
                    {word}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {style.refusals.length ? (
            <div className="sticker-card mt-5 p-5 sm:p-6" style={{ ["--card-ink" as string]: "var(--sakura)", background: "color-mix(in srgb, var(--sakura) 7%, var(--paper-tint-base))" }}>
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Never — the anti-prompt</div>
              <BulletList items={style.refusals} empty="No refusals recorded." />
            </div>
          ) : null}
        </Section>

        {/* ── The checkable contract ────────────────────────────────────── */}
        {Object.keys(style.bandsJson).length ? (
          <Section eyebrow="the contract" ink="var(--ramune)">
            <p className="mb-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
              Computed from the corpus above, then enforced. Every replica this voice produces is measured against these
              numbers, and a contract its own corpus fails does not ship.
            </p>
            {lines.length ? (
              <div className="sticker-card p-5 sm:p-6" style={{ ["--card-ink" as string]: "var(--ramune)" }}>
                <BulletList items={lines} empty="" />
              </div>
            ) : null}
            <div className="sticker-card mt-5 p-5 sm:p-6">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">As the checker reads it</div>
              <Folded openLabel="Fold the contract" closedLabel="Show every band" height={220}>
                <pre className="overflow-x-auto bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] p-4 font-mono text-[13px] leading-relaxed text-foreground">
                  {JSON.stringify(style.bandsJson, null, 2)}
                </pre>
              </Folded>
            </div>
          </Section>
        ) : null}

        {/* ── The round trip: a model given only the contract ───────────── */}
        {style.replications.length ? (
          <Section eyebrow="round-trip proof" ink="var(--graphite)">
            <p className="mb-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
              A model was given the VOICE.md alone — no corpus, no other context — and wrote these. They are replicas,
              never the author&apos;s words, and each one passed the bands above. This is the evidence that the contract
              works as a prompt.
            </p>
            <div className="grid gap-5">
              {style.replications.map((replica) => (
                <article key={replica.fileId} className="sticker-card p-5 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{replica.provenance || replica.model || "replica"}</span>
                    <InkStamp ink="var(--ramune)" tilt={1}>passed the bands</InkStamp>
                  </div>
                  <Folded openLabel="Fold this replica" closedLabel="Read the whole replica" height={260}>
                    <div className="max-w-3xl space-y-4 text-[17px] leading-[1.62] text-foreground">
                      {replica.text.split(/\n\n+/).map((paragraph, p) => (
                        <p key={p} className="whitespace-pre-line">{paragraph}</p>
                      ))}
                    </div>
                  </Folded>
                </article>
              ))}
            </div>
          </Section>
        ) : null}

        {/* ── Provenance: where the words came from, and on what basis ──── */}
        <Section eyebrow="provenance" ink="var(--ramune)">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sticker-card p-5 sm:p-6">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Corpus consent</div>
              <KeyValueTable
                rows={Object.fromEntries(
                  (
                    [
                      ["basis", BASIS_LABEL[style.consent.basis] ?? style.consent.basis],
                      ["author", style.consent.author],
                      ["license", style.consent.license],
                      ["samples", style.consent.samples],
                    ] as Array<[string, string]>
                  ).filter(([, value]) => value),
                )}
                empty="No consent recorded."
              />
            </div>
            <div className="sticker-card p-5 sm:p-6">
              <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Credits · in the lineage of</div>
              <CreditsList credits={style.credits} />
            </div>
          </div>
          {style.verification ? (
            <div className="sticker-card mt-5 p-5 sm:p-6" style={{ ["--card-ink" as string]: "var(--ramune)" }}>
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Verification record</div>
              <p className="mb-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
                Written by the finalizer at verification time{style.verification.engine ? ` — ${style.verification.engine}` : ""}.
              </p>
              {Object.keys(style.verification.texts).length ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(style.verification.texts).map(([key, value]) => (
                    <span key={key} className="bg-[color-mix(in_srgb,var(--foreground)_5%,transparent)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground tabular-nums">
                      {key.replaceAll("_", " ")} · {value}
                    </span>
                  ))}
                </div>
              ) : null}
              {style.verification.checksPassed.length ? (
                <BulletList items={style.verification.checksPassed.map((check) => check.replaceAll("_", " "))} empty="" />
              ) : null}
            </div>
          ) : null}
          <div className="mt-5">
            <ModelProvenance raw={style.modelProvenanceRaw} />
          </div>
        </Section>

        {/* ── The artifact itself ──────────────────────────────────────── */}
        {style.voiceMd ? (
          <Section eyebrow="voice.md" ink="var(--graphite)">
            <p className="mb-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
              The portable contract, exactly as an agent receives it. Its address is{" "}
              <code className="font-mono text-[15px] text-foreground">{SITE}/voice/{style.id}/VOICE.md</code>, which
              answers to your signed-in session and to nobody else while the writing lane is unpublished — so the copy
              above carries the text itself and works from anywhere.
            </p>
            <div className="sticker-card p-5 sm:p-6">
              <Folded openLabel="Fold VOICE.md" closedLabel="Read the whole file" height={320}>
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[13.5px] leading-relaxed text-foreground">{style.voiceMd}</pre>
              </Folded>
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
