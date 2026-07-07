# Writing styles: the verification approach, measured

Status: living document · Data: production catalog, 2026-07-04 → 2026-07-06 · Owner: curation

This documents the entire writing-styles approach — what a voice is, what the
contract file carries, what is verified and how — and the experiments that
back every claim. Where a number appears, it was measured on the production
catalog; where a claim failed measurement, the failure is recorded here.

## 1. The shape

**Level 0 — author voices.** One corpus, one named contributor. A
public-domain author's works are a contributed voice (consent basis
`public_domain`, works and editions named); a living person's samples enter
through the opt-in intake with consent bound in the same dispatch as the
corpus. Author voices double as the calibration set for every measuring
instrument below.

**Level 1 — blends and registers.** A voice with `parent_ids`: its own merged
corpus, its own derived bands, lineage displayed. Original registers
(pipeline-authored corpora) sit here too.

**The catalog under study:** 15 author voices + 2 blends, 2,400–4,900 corpus
words each, all public-domain or original.

## 2. The contract file (VOICE.md, format beta)

The portable prompt an agent receives. Everything derivable is derived:

| section | provenance |
|---|---|
| identity, lineage, consent, verification summary | entity data |
| Overview / Tone / Moves / Register / Never | authored (visibly editorial) |
| **How it reads** — one full corpus excerpt | quoted verbatim, source-labeled |
| **Rhythm — write to these numbers** | derived from the bands |
| **Linguistic profile** | measured from the corpus (sentence stats, punctuation per 1000 words, opener distribution, connective rate, lexis weight, TTR/hapax) |
| **Known-good replica** | LLM output that passed verification, model named |
| Bands JSON | the machine contract |

Format alpha (description-only) measured **9/17** one-shot replication;
format beta measured **15/17** (E2). The file format is an experimental
variable with a metric, not a matter of taste.

## 3. The verification stack

1. **Hard deterministic bands** (gate): 12 checks per text — banned
   phrases/patterns, sentence-length band, burstiness floor, exclamation
   rate, windowed TTR and hapax floors, function-word and char-trigram
   distance to the corpus, opener-repetition ceiling, connective band,
   paragraph variance. Limits are **derived, never invented**: fingerprint
   limits come from the corpus's own out-of-sample 220-word chunks
   (chunk-null calibration) — in-sample calibration was tried first and
   rejected 17/17 valid replicas (limits like 0.05 that no external text can
   meet).
2. **Round-trip replication** (gate): a cold LLM (fresh context, the VOICE.md
   as only input) must produce text that passes the voice's own bands.
   Attached with per-sample model provenance; verifier-owned booleans; a
   Publish guard and a spec invariant make the proof permanent.
3. **Soft style similarity** (report-only, never gates): background-normalized
   Burrows's Delta — see §5. Scores and verdicts land in the verification
   report with the background version stamped.
4. **The curator** (the only gate that publishes): mechanics are machine
   matters; taste is human.

## 4. Choosing the similarity instrument (the bake-off)

Calibrated on the 17 voices — leave-one-out corpus chunks as positives,
cross-voice chunks as negatives, 17-way replica retrieval:

| method | mean AUC | retrieval |
|---|---|---|
| **Burrows's Delta, 500 MFW, z-cosine** | **0.960** | 8/17 |
| Delta 300 MFW + char-3gram hybrid | 0.955 | 7/17 |
| StyleDistance (neural) | 0.813 | 5/17 |
| Wegmann Style-Embedding (neural) | 0.789 | 3/17 |

**Scope of this finding — instruments, not emulators.** This measures neural
embeddings as *verifiers* on a catalog of period literary registers, far from
their contemporary conversational training domains. It says nothing against
LLM style *emulation* — which the same study measured as strong (§6.3). For
contemporary and personal voices the neural instruments are expected to
recover; the committed harness (`katagami-curation/tools/`) re-runs the
bake-off in minutes when that catalog exists. Retrieval misses concentrate in
same-register families (blends vs their own parents) — expected, and arguably
correct behavior for a register-based catalog.

## 5. The validity incident — and why the known-answer test is permanent

The first shipped scorer used per-voice normalization. A voice's own z-scores
sum to zero by construction, so its centroid collapsed to the zero vector,
every leave-one-out floor evaluated to −1, and **all candidates — impostors
included — verified as within range (100% false-accept)**. Every verdict in
the first production run was vacuous.

Caught by E1, the known-answer test: held-out genuine text (different works
by the same author where available: *Mansfield Park* and *Sense and
Sensibility* against the Austen profile, *Roughing It* against Twain) versus
impostor text from other voices. After the fix (catalog-background
normalization, `style_background_v1.json`, versioned and regenerable):

| metric | broken scorer | fixed scorer |
|---|---|---|
| genuine-accept (28 held-out passages) | 100% (vacuous) | **89%** |
| impostor false-accept (364 trials) | 100% | **15%** |
| replica discrimination | none | 10/14 within the author's own held-out range |

Residual false-accepts cluster in same-register families. The known-answer
protocol is now part of the release path for any instrument change.

## 6. Experiments

### 6.1 E2 — does the file format matter?
Cold replication (fresh Opus 4.8 contexts, file-only input), one sample per
voice. Format alpha: 9/17 one-shot bands pass. Format beta: **15/17**, with
both failures marginal fingerprint misses (e.g. trigram 0.251 vs limit
0.245). Caveat: topic differed between runs (bands are content-independent by
design, but this is a confound to close with a topic-controlled rerun).
Delta fingerprint margins did *not* improve alpha→beta (both 11/17 within
range) — numeric instructions steer the instructed dimensions; the 500-word
fingerprint follows the excerpt only partially.

### 6.2 E3 — does the feedback steer?
Every bands failure names its violation with numbers ("burstiness 7.1 below
9.6"). Recovery rate when the violation is fed back verbatim with numeric
targets: alpha round — **8/8 recovered**, 7 in one revision, 1 (Strunk) in
two. A confirmation round on the two beta failures recovered Aurelius in one
revision; Strunk improved (function-word distance 0.145 → 0.129) but stayed
short of its limits. The consumer loop (write → check → revise) is
demonstrably sufficient steering for the banded dimensions, with one
diagnosed exception: Strunk. The first diagnosis (table-of-contents matter in
the corpus) was FALSIFIED by a corpus audit — the excerpts are clean prose,
but one of three is the book's glossary section, a second in-book register
whose dictionary-entry style pulls the fingerprint away from the teaching
prose the contract asks for. The fix remains corpus-level (single-register
excerpting), and the audit heuristics now exist to check every corpus.

### 6.3 Can LLMs emulate these styles at all?
Yes — measured, not assumed. Under the *validated* scorer, 10/14 cold
replicas sit inside the band where the author's own held-out writing lands;
under the hard bands, 15/17 replicate one-shot from the beta file. The gap
that remains is fingerprint-level (function-word habits), which is also the
dimension hardest to instruct in words — the strongest known lever is more
verbatim corpus in the file (the beta excerpt), and E2 suggests it worked.

### 6.4 E4 — is "author drift" real, or the instrument's shortcoming?

Challenged by review ("are you sure real authors drift, and are you sure
that's not our measuring method's shortcoming?"), decomposed directly:
same-author scores laddered from same-works → unseen-works → other-authors,
at three sample lengths, against the production profiles.

Jane Austen (21-chunk profile):

| sample | same-works | unseen works | other authors |
|---|---|---|---|
| 220 words | +0.203 ±0.060 | +0.252 ±0.066 | −0.060 ±0.029 |
| 500 words | +0.265 ±0.049 | +0.313 ±0.055 | −0.040 ±0.026 |
| 1000 words | +0.370 ±0.047 | +0.357 ±0.064 | −0.024 ±0.056 |

**The reviewer was right.** Unseen-work scores are statistically
indistinguishable from same-work scores at every length — detectable
cross-work "drift" for Austen is approximately zero. The width of the
"genuine band" is dominated by **short-sample noise**: scores rise and
tighten monotonically with sample length (classic small-sample attenuation),
so at 220 words the instrument under-measures similarity and adds variance.
"Authors always drift a little" was the wrong explanation; "short samples
always measure noisily" is the right one. Author *identity* separation is
meanwhile robust at all lengths (gap ≈ +0.28 to +0.39). Twain (a weaker,
single-work 10-chunk profile) shows the same shape with a thinner gap
(+0.08 to +0.13) — corpus size matters.

Design consequences: (1) the acceptance floor is honest **because it is
noise-matched** — 220-word replicas are judged against 220-word chunk noise;
(2) longer candidate texts deserve length-matched calibration (tighter floors
at 500/1000 words) — roadmap for the conformance endpoint; (3) corpora below
~20 chunks give weak profiles; grow thin corpora before trusting their soft
scores.

### 6.5 E5 — the Goodhart test: is the stack circular?

Review put the sharpest question: "are the checks measuring the voice, or is
the LLM just instructed to pass the checks, and passing is then declared
emulation?" Tested with four generation conditions, all scored on BOTH layers
(disclosed bands = compliance; hidden Delta fingerprint = verification):

| condition | tier 1 (bands) | tier 2 (≥ floor) | tier 3 (positive margin) | mean margin over floor |
|---|---|---|---|---|
| B checklist-only (numbers, no voice) | **15/17** | **7/17** | **2/17** | **−0.003** |
| A full beta contract | 16/17 | 12/17 | 6/17 | +0.041 |
| C excerpt-only (voice, no numbers) | 12/17 | **14/17** | **10/17** | **+0.078** |
| D alpha contract, same topic | 7/17 | 10/17 | 6/17 | +0.033 |

Tier-3 leakage for the gamed condition (2/17) is explained, not mysterious:
its two wins are Grimm and Slocum, where the shared test topic (a lighthouse
logbook tale) pulls default prose toward the told-tale and maritime-log
registers — a measured residue of topic sensitivity in MFW-Delta, and the
kind of case the curator tier exists for. Earlier phrasing "never reaches
tiers 2–3" was over-strong and is corrected here.

Findings:
1. **The disclosed bands are gameable — confirmed.** Constraint-only text
   passes them 15/17 with no voice guidance at all. Band-passing alone is
   compliance, never emulation, and the system must never claim otherwise.
2. **The hidden fingerprint is not gamed.** The same constraint-only texts
   land at impostor-level fingerprint margins (−0.003, the worst condition).
   The fingerprint target (500-MFW centroid under catalog normalization) is
   not reproducible from the contract file, so the only strategy that moves
   it is genuine imitation of the corpus's word-habits.
3. **The voice lives in the prose.** Excerpt-only imitation produced the best
   fingerprint results of any condition — stronger than the full contract —
   while passing fewer disclosed checks. Verbatim corpus excerpts are the
   primary carrier of style; the numbers are rails, not the voice.
4. **The format effect survives topic control** (D): alpha on the identical
   topic scores 7/17 bands vs beta's 16/17 — the E2 confound is closed and
   the true effect is larger than first measured.

Layer roles, restated from evidence: bands = disclosed compliance rails
(gameable, and that is acceptable because nothing is claimed from them
alone); Delta fingerprint = verification (validated on ground truth,
resistant to targeting); curator = meaning and taste. A voice verifies only
when all three agree.

### 6.6 E6 — mirror-negative calibration (the Pangram import)

For each voice, the mirror set is same-topic text NOT in its voice: its own
numbers-only (gamed) generation plus every other voice's texts across all
four conditions (~57–65 mirrors per voice, lineage excluded). Findings:

- At the old noise floors, mirrors pass **19% overall** — with extreme
  per-voice variance (Dana 53/61, Twain 41/65 falsely in; Aurelius, Pepys,
  Plainhand 0). The permissive-floor soft spot, quantified per voice.
- A `max+ε` mirror threshold is brittle (one style-adjacent mirror inflates
  the bar — Slocum). The robust rule is the **P95 mirror threshold**: 12/17
  current replicas clear a topic-controlled bar, and the five below it are
  the same voices the catalog margins flagged. P95-mirror becomes the
  recommended distinctiveness criterion, replacing raw floors for tier 3.

### 6.7 E7 — what the feedback loop actually changes (standing metric)

The system now records every revision as a before/after pair on both layers.
First pairs: Aurelius — bands fail → pass AND fingerprint **+0.076** in one
revision; Strunk — bands still failing, fingerprint +0.009 (consistent with
its corpus-composition diagnosis: feedback cannot fix a contaminated target).
Conclusion so far: numeric feedback improves genuine imitation, not just
compliance, when the corpus is clean — the loop is substantive, not
test-teaching. The metric runs on every future revision by default.

### 6.8 E8 — instrument fusion (Delta × neural embedding)

On the known-answer protocol (28 genuine held-out passages, 364 impostor
trials), instruments alone and fused:

| rule | genuine accept | impostor false-accept |
|---|---|---|
| Delta alone (production) | 25/28 (89%) | 55/364 (15%) |
| Wegmann embedding alone | 27/28 (96%) | **189/364 (52%)** |
| **AND fusion** | 24/28 (86%) | **39/364 (10.7%)** |
| **agree-or-abstain** | 24 accept + 4 abstain | 39 accepted, **166 sent to abstain** |

Even on the neural model's weak domain, fusion helps: AND-fusion cuts false
accepts by ~29% relative for the cost of one genuine. **Agree-or-abstain is
the curator-facing shape**: definitive verdicts only where two independent
instrument families concur; everything contested abstains to the human. The
fusion harness is committed (tools/e8_fusion.py); production adoption follows
the embedding-service decision, and is expected to strengthen further on
contemporary voices where the neural instrument is in-domain.

## 7. Honest limitations

- **Small n.** 17 voices, 1 replica per voice per condition, one generator
  model (Opus 4.8). Effects as large as 9→15 survive small n; subtler claims
  here should not be over-read.
- **Topic confound** in E2 (alpha and beta runs used different topics).
- **Same-work held-out** for 12 of 14 voices in E1b (different-work held-out
  only for Austen and Twain) — same-work inflates genuine-accept slightly.
- **Family confusability**: parents and their blends cross-accept; a
  register-level catalog may want family-aware verdicts.
- **Prod replicas are revised, not one-shot** (they went through the E3 loop
  before attachment); the report's replication flag says which.
- **Plainhand abstains** on Delta (corpus below the 4-chunk floor) — thin
  corpora abstain rather than guess, by design.
- Bands and Delta measure **mechanics**. Meaning, wit, and judgment are the
  curator's gate and, later, scored abstaining similarity layers beyond MFW.
- E5 also suggests the full contract slightly *dilutes* fingerprint imitation
  versus excerpt-only (attention split between numbers and prose) — a format
  v3 hypothesis (lead harder with prose) for a controlled follow-up.

## 8. Related work — what this study builds on

- **Function-word attribution**: Mosteller & Wallace (1964), *Inference and
  Disputed Authorship: The Federalist*; Burrows (2002), "'Delta': a Measure
  of Stylistic Difference" — our production scorer's lineage.
- **Character n-grams**: Stamatatos (2009 survey; 2018 text-distortion /
  content masking) — our trigram check; content masking is the queued fix
  for topic residue.
- **Verification methodology**: Koppel & Winter (2014), the impostor method —
  the ancestor of our mirror-negative calibration; PAN authorship-verification
  labs (Bevendorff et al., PAN 2023–2025) — c@1/abstention discipline and the
  finding that pretrained-LM + contrastive methods now dominate.
- **Neural style representations**: Rivera-Soto et al. (2021) LUAR; Wegmann
  et al. (2022) style embeddings and the STEL-or-content caveat; Patel et al.
  StyleDistance (synthetic controlled pairs) — our bake-off subjects.
- **LLM style imitation**: "Catch Me If You Can? Not Yet" (arXiv 2509.14543,
  EMNLP 2025): 400+ authors, ensemble metrics; finds LLMs approximate
  structured registers well and informal implicit style poorly — matching our
  period-register success. "How Well Do LLMs Imitate Human Writing Style?"
  (arXiv 2509.24930). "Theory-Grounded Evaluation Exposes the Authorship Gap"
  (arXiv 2604.26460): argues personalization evaluation must be grounded in
  authorship-verification theory with validated instruments — the position
  this stack implements. Patel et al. (2022) low-resource authorship style
  transfer (arXiv 2212.08986).
- **AI-text detection engineering**: Pangram technical report (Emi & Spero,
  arXiv 2402.14873) — hard negative mining with synthetic mirrors, FPR-first
  evaluation, fairness checks; Pangram Space interpretability probes. Our E6
  mirrors and hard-case loop are direct imports.
- **The 2026 frontier**: Zeng & Nini (arXiv 2603.29454, March 2026),
  "Authorship Impersonation via LLM Prompting" — a training-free verifier
  (TF-IDF char n-grams + transformer embeddings + empirical distance
  distributions, 97.5% in-domain) tested against LLM impersonation across
  prompting strategies; headline finding: **prompting strategy matters more
  than model size for style fidelity**, which is exactly the variable our
  format experiments (E2/E5) manipulate — and their result that LLM mimicry
  retains detectable artifacts parallels our nearest-other margins catching
  residual model accent. "Theory-Grounded Evaluation Exposes the Authorship
  Gap" (arXiv 2604.26460, April 2026) — personalization evaluation must be
  grounded in authorship-verification theory with validated instruments and
  calibrated baselines: the position this stack implements. "Measuring
  Embedding Sensitivity to Authorial Style" (arXiv 2605.10606, May 2026) —
  authorial signal in embeddings persists through LLM rewriting and carries
  LLM-specific patterns, supporting both our fusion direction and the
  model-accent reading of negative margins. "Attribution Quality in
  AI-Generated Content: Benchmarking Style Embeddings and LLM Judges"
  (arXiv 2510.13898) — benchmarks the exact instrument pair our fusion
  study compares.
- **Style-transfer evaluation**: "Mind the Style Gap" (arXiv 2502.15022) —
  meta-evaluation of style/content metrics; supports separating style
  strength from content preservation, which our content-masking roadmap item
  addresses.

## 8b. Roadmap

1. Topic-controlled E2 rerun + per-section ablation of the beta format.
2. Neural instruments recalibrated when contemporary/personal voices exist
   (the intake is live; the harness is committed).
3. ARN-139 extraction: derive the authored layer from corpora automatically.
4. The public conformance endpoint ("check this draft against voice X") —
   bands + Delta + verdicts, the same stack consumers will call.
5. Background regeneration policy: `style_background_v1.json` is rebuilt by
   tool when the catalog composition shifts materially; version stamped in
   every report.
6. Strunk corpus curation: re-excerpt to a single in-book register (teaching
   prose, excluding the glossary section) so the fingerprint matches what the
   contract asks for.
