# Writing kit — getting LLMs to follow a human's written style

Everything needed to write the blog post or paper: the story in order, every
number's location, the reproducibility data, and the full bibliography.
Companion to [0001-writing-styles-verification-study.md](0001-writing-styles-verification-study.md),
which is the technical skeleton; this file is the writer's index.

## The story, in order (each beat has data behind it)

1. **The premise** — a voice as a verifiable contract, not soft guidance:
   consented corpus, derived mechanical bands, a portable VOICE.md, and a
   publish gate a machine enforces (RFC-0002).
2. **The first taste failure** — the curator caught AI-lit flourishes in an
   original-basis voice that had passed every mechanical check; the human
   gate became load-bearing by design (curator gate: no auto-publish).
3. **Derived, never invented** — bands calibrated from the corpus's own
   out-of-sample chunks after in-sample calibration rejected everything
   (0/17 → the chunk-null method).
4. **The round-trip proof** — a contract is real only if a cold LLM, given
   the file alone, writes text that passes the voice's own bands. First
   run 0/17 (miscalibration), then 9/17 (format alpha), then 15/17 (format
   beta, topic-controlled 16/17 vs 7/17).
5. **The validity incident** — the reviewer's "are replica scores even
   accurate?" exposed a degenerate scorer (100% impostor acceptance); the
   known-answer test became permanent protocol. Fixed instrument: 89%
   genuine-accept / 15% impostor false-accept on held-out ground truth.
6. **Drift is noise** — E4: "authors drift between works" was the wrong
   story; unseen-work scores match same-work scores at every length; the
   band is short-sample measurement noise. Floors must be noise-matched
   and length-matched.
7. **The Goodhart test** — text written to the disclosed numbers games the
   compliance layer (15/17) but collapses on the hidden fingerprint
   (7/17, then 2/17 at distinctiveness). The principle: **bands gate,
   never grade** — imitation is claimed only from game-resistant
   instruments.
8. **Mirror calibration** — Pangram's hard-negative discipline imported:
   same-topic off-voice mirrors expose permissive floors (19% mirror
   acceptance) and set the P95 topic-controlled distinctiveness bar
   (12/17 replicas clear it).
9. **Feedback improves imitation, not just compliance** — the standing
   before/after metric: fingerprint +0.076 alongside bands fail→pass.
10. **Fusion** — two independent instrument families (Delta + neural
    embedding) drop impostor acceptance to 10.7% AND-fused, with
    agree-or-abstain routing all contested cases to the human.
11. **The architecture in one sentence** — neural writes, symbolic
    verifies, human judges.

## Where every number lives

| what | where |
|---|---|
| all experiment tables (E1–E8) | [0001 study](0001-writing-styles-verification-study.md) §5–6 |
| raw per-voice data | [data/](data/) — validity, format, Goodhart, mirror-calibration, calibration JSONs |
| the texts themselves (all conditions + final replicas) | [data/conditions/](data/conditions/) — 85 generated passages across A/B/C/D + attached replicas |
| the studied contracts (VOICE.md format beta, all 17) | [data/contracts/](data/contracts/) |
| the instruments (source of truth) | `katagami-curation/wasm/finalize_spawned_session/src/lib.rs` + `style_background_v1.json` |
| the harness (rerun anything) | `docs/research/harness/` — calibration, bake-off, mirror calibration, fusion, local checker, VOICE.md builder |
| per-voice live verification records | production `WritingStyles.verification_report` + katagami.ai/voice/&lt;id&gt; |
| the visual reference | the "Voice verification — every check, both paths" artifact (Galley) |
| decision history | Linear ARN-121/ARN-133 thread; Aya goal journals |

## Bibliography (with links)

Classical stylometry
- Mosteller, F. & Wallace, D. (1964). *Inference and Disputed Authorship: The Federalist.*
- Burrows, J. (2002). "'Delta': a Measure of Stylistic Difference and a Guide to Likely Authorship." *LLC 17(3).*
- Stamatatos, E. (2009). "A Survey of Modern Authorship Attribution Methods." *JASIST.* — and (2018) text distortion / content masking.
- Koppel, M. & Winter, Y. (2014). "Determining if Two Documents Are Written by the Same Author." *JASIST.* (the impostor method)
- Evert, S. et al. (2017). "Understanding and explaining Delta measures for authorship attribution." *DSH.*

Neural style representation
- Rivera-Soto, R. et al. (2021). "Learning Universal Authorship Representations (LUAR)." *EMNLP.*
- Wegmann, A. et al. (2022). "Same Author or Just Same Topic? Towards Content-Independent Style Representations." (STEL-or-content) — model: AnnaWegmann/Style-Embedding.
- Patel, A. et al. (2024). "StyleDistance: Stronger Content-Independent Style Embeddings with Synthetic Parallel Examples." https://arxiv.org/abs/2410.12757

Verification methodology / shared tasks
- Bevendorff, J. et al. — Overviews of PAN 2023–2025 (authorship verification, generative-AI authorship). https://pan.webis.de/
- PAN c@1 / abstention-aware evaluation.

LLM style imitation (2025–2026 frontier)
- "Catch Me If You Can? Not Yet: LLMs Still Struggle to Imitate the Implicit Writing Styles of Everyday Authors." arXiv:2509.14543, EMNLP 2025 Findings.
- "How Well Do LLMs Imitate Human Writing Style?" arXiv:2509.24930.
- Patel et al. (2022). "Low-Resource Authorship Style Transfer." arXiv:2212.08986.
- **Zeng & Nini (2026). "Authorship Impersonation via LLM Prompting."** arXiv:2603.29454 — prompting strategy beats model size for style fidelity; LLM mimicry retains detectable artifacts.
- **"Theory-Grounded Evaluation Exposes the Authorship Gap in LLM Personalization."** arXiv:2604.26460 (2026) — ground personalization evaluation in authorship-verification theory.
- **"Measuring Embedding Sensitivity to Authorial Style."** arXiv:2605.10606 (2026) — authorial signal persists through LLM rewriting; LLM-specific patterns.
- "Attribution Quality in AI-Generated Content: Benchmarking Style Embeddings and LLM Judges." arXiv:2510.13898.
- "Mind the Style Gap: Meta-Evaluation of Style and Attribute Transfer Metrics." arXiv:2502.15022.
- "Stylometry recognizes human and LLM-generated texts in short samples." arXiv:2507.00838.

AI-text detection engineering
- Emi, B. & Spero, M. (2024). "Technical Report on the Pangram AI-Generated Text Classifier." arXiv:2402.14873 — hard negative mining with synthetic mirrors; FPR-first.
- Pangram Space (2026) — interpretability probes over a detection model. https://www.pangram.com/pangram-space

Lexical richness
- Yule, G. U. (1944). *The Statistical Study of Literary Vocabulary.* Herdan, G. (1960). *Type-token Mathematics.*

## The VOICE.md ecosystem (practitioner survey, 2026-07-08, sourced by Rita)

Seven real-world approaches to voice files exist in the wild; none share a
standard, but nearly all converge on one principle — **concrete examples
teach better than abstract rules** — which our E2/E5/E11 results measured
independently (the excerpt is the strongest conditioning signal; excerpt-only
imitation beat the full contract on the fingerprint). Independent folk
convergence + our measurement = a strong opening argument for the writeup.

| approach | shape | relation to ours |
|---|---|---|
| efeoncepro/voice.md | formal open spec, "VOICE.md is to copy what DESIGN.md is to visual identity" | our direct kin — interop/export target |
| Frizelle (Claude Code) | rules + 5–10 "gold standard" samples | multi-example variant of our single excerpt — testable |
| Sherrard-Smith | 5 sentences + 10 banned words + 1 length rule | the minimal folk baseline — a ladder floor condition |
| Becoming with AI | voice.md + audience.md (platform tone split) | our register-by-channel matrix, externalized — consumer product idea |
| Barger three-file | voice / structure / platform + checklist | maps to our voice layer / bands / register split |
| OpenWriter Author's Voice | NEVER rules, fingerprints, sentence stats, coined terms | closest to ours: their NEVER = our anti-prompt; their stats = our measured profile; **coined terms** = a section we lack |
| DragonClaw deep-voice-analysis | automated 47-marker profile | prompt-based cousin of ARN-139 extraction (ours is measured, theirs is LLM-asserted) |

Sources: github.com/efeoncepro/voice.md · ryanfrizelle.com/guides/humanizer-claude-code ·
Sherrard-Smith (LinkedIn post 7464948730048245760) · becomingwithai.net/p/ai-writing-workflow ·
donbarger.com/p/give-claude-your-voice-the-three · openwriter.io/authors-voice ·
skillsmp.com deep-voice-analysis.

What we take (queued as experiments/features, see ledger F-series):
1. **E13 — example-count ablation**: 1 long excerpt (ours) vs 5–10 short gold
   samples (Frizelle) vs the Sherrard-Smith minimal baseline, on the standard
   ladder. Answers "how much does our machinery buy over folk practice."
2. **Coined-terms section** (OpenWriter): derivable symbolically — the
   corpus's high-frequency author-specific content words are already computed
   in the attribution tool; promote them into VOICE.md as signature
   vocabulary.
3. **efeoncepro interop**: an export mapping from our contract to their spec
   (community reach for the commons).
4. **audience.md companion** (consumer-side): platform tone adaptation atop a
   voice — product feature, post-conformance-endpoint.
5. **DragonClaw marker review**: mine their 47 markers for features our
   measured profile lacks.

## The adherence-tool landscape (verification products, 2026-07-08, sourced by Rita)

A full product category now sells exactly the primitive our conformance
endpoint implements: reference voice in, new text scored against it,
deviations flagged. How each actually verifies, by mechanism:

| mechanism | tools | what it really is |
|---|---|---|
| shallow interpretable metrics | WriteBetter (sentence length, vocab complexity, formality, passive voice, pronoun frequency → 0–100%) | a 5-feature subset of our 13 bands, with **no calibration** — the percentage has no null distribution behind it |
| opaque trained matcher | VoiceMoat ("trains on your profile", markets "90%+ match") | embedding- or judge-based similarity; the number is asserted, not validated |
| LLM-judge with structured prompts | River (ghostwriter match + consistency), Agent.AI, PressMaster, SocialBu, Taskade, Lindy ("tone 78% on-brand"), ClickUp | confident percentages from an uncalibrated judge — our E9 measured exactly this failure mode: judge feedback sounded expert while moving the true fingerprint *down* |
| detection + auto-rewrite loop | Hold Your Voice | our write→check→revise loop, productized without a validated instrument |
| threshold/classifier pipeline | Oleno (voice-drift NLP pipeline) | the closest philosophical kin — measurable thresholds, build-it-yourself |
| governance gating | CommsWith.AI | verifier-gates-before-publish — our verifier-owned-booleans pattern in enterprise form |

**Mechanism taxonomy (researched 2026-07-08):** (1) deterministic linguistic
engines — Acrolinx (real engine, thousands of properties, hand-authored rules
per company, score = length/(length+issues)), WriteBetter (5 shallow
features); (2) semantic-embedding similarity — Oleno's DIY pipeline (USE/
OpenAI cosine vs exemplar paragraphs + weighted rules + small classifier,
precision SLOs) — real engineering, wrong instrument: semantic embeddings
measure topic, the conflation our framework rejects; (3) trained tone
classifiers — Grammarly (rules+ML over word choice/phrasing/punctuation/
capitalization → 40+ tone labels; orgs mark tones on/off-brand) — genuine
models, but tone-label granularity cannot distinguish authors; (4) custom
fine-tuned LLMs — Writer.com trains two Palmyra-family models (voice-
extraction LLM: samples → profile; voice-generation LLM: writes in-profile)
— the real "we train models" tier, generation-side, profiles LLM-asserted;
VoiceMoat's "90%+ match" likewise asserted; (5) LLM-judge prompt agents —
Agent.AI/Taskade/Lindy/SocialBu/PressMaster/River/ClickUp/Jasper; (6)
governance gating — CommsWith, Acrolinx scorecards, Writer guardrails.
Field-wide: nobody derives thresholds from the author's own out-of-sample
null, publishes known-answer validation, Goodhart-tests their own score, or
uses authorship-science instruments. Writer's two-model pattern = our
ARN-139 + replica pipeline with assertion where we put measurement.

Additional sources: acrolinx.com (score formula, linguistic engine) ·
writer.com/blog/voice-feature + superpath.co (Palmyra voice models) ·
grammarly.com/blog/tone-detector + brand-tones PDF · jasper.ai/brand-voice ·
oleno.ai voice-drift pipeline (full technical detail).

**What the whole category lacks and we have, measured:** calibrated floors
(noise-matched, length-matched), ground-truth validation (89% genuine /
15%→1% impostor under fusion), game-resistance separation (the Goodhart
tiers), abstention, and per-feature computed attribution. E4 is the killer
critique of the category's headline numbers: similarity scores move with
sample length alone, so an uncalibrated "90% match" is not a measurement.
That contrast is a core argument for the writeup — and the commercial
positioning of the conformance endpoint.

**Imports queued from this batch (ledger):**
1. **Windowed drift mode** for the conformance endpoint (River's consistency
   checker / Oleno's pipeline, done right): slide the scorer over a long
   manuscript in 220-word windows, flag drifting sections with attribution —
   our chunk machinery already computes this shape.
2. **Correction loop as product**: conformance verdicts + attribution feed an
   auto-revise pass (Hold Your Voice's loop, with a validated instrument and
   the E11-proven feedback content).
3. **Brand-guidelines intake**: compile a contract from brand documents (the
   Agent.AI/Taskade input mode) — an intake variant alongside samples-based
   opt_in; guidelines become the authored layer, samples still required for
   the measured layer.
4. **E14 — competitive validity study**: run our known-answer protocol
   (genuine held-out vs impostors) through the free tools (WriteBetter at
   minimum) and compare false-accept behavior against ours, for the paper's
   related-products section.

Sources: voicemoat.com · writebetter.ai/tools/compare-texts ·
rivereditor.com (client-voice-match, voice-consistency) · saasbranch.com
(Hold Your Voice) · agent.ai brand-voice-consistency-checker · pressmaster.ai
· socialbu.com · taskade.com · lindy.ai · commswith.ai · oleno.ai
(voice-drift pipeline) · clickup.com brand-voice agent.

## Claims safe to make (each backed in-repo)

- A description-only style file under-teaches rhythm; adding a verbatim
  excerpt and numeric rails raised one-shot replication 7/17 → 16/17
  (topic-controlled).
- Disclosed numeric checks are gameable by construction and must never
  count as imitation evidence (15/17 gamed compliance vs 2/17 gamed
  distinctiveness).
- Classical Delta outperformed 2022-era neural style embeddings as a
  verification instrument on period literary registers (0.960 vs 0.813/0.789
  AUC) — an instrument-domain result, not an emulation claim.
- Under a ground-truth-validated instrument, most cold LLM replicas score
  inside the author's own held-out range — and the residue the margins
  catch is quantifiable modern-model accent.
- Two independent instrument families plus abstention beat either alone
  (impostor acceptance 15% → 10.7%, contested cases abstain).
