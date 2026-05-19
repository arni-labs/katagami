# Taste Distillation

Job type: `taste_distillation`

Use this skill to convert Katagami taste signals into short, general proposed
prompt directives for the agents that create and review new design languages.
This is not a quality-repair job, not a catalog-management job, and it must not
mutate DesignLanguages.

The primary output is a compact `rule_text` line that could be pasted directly
into the creator/reviewer prompt. Evidence belongs in `rationale` and the
Markdown report, not in the directive itself.

The directives must be language-agnostic design tests. Do not overfit to the
surface theme, genre, subject matter, or named aesthetic of any evidence
language. Each accepted directive should improve any future language, whether
it is editorial, operational, playful, cinematic, brutalist, delicate,
illustrative, data-heavy, or experimental.

The `json` helper is preloaded. Use `json.dumps(...)` and `json.loads(...)`
without importing `json`.

## Required Inputs

The job input is optional JSON. Supported keys:

- `archived_language_ids` - optional explicit negative corpus. If absent, use the most recent Archived DesignLanguages.
- `featured_language_ids` - optional explicit positive corpus. If absent, use Published DesignLanguages whose `featured` state is true.
- `limit` - optional maximum archived examples to analyze. Default 100.

## Signal Boundaries

1. **Archive is the only negative signal.** Negative anti-patterns must use only DesignLanguages whose status is `Archived`, or explicit `archived_language_ids` that currently resolve to Archived languages.
2. **Featured is the only positive signal.** Positive patterns must use only DesignLanguages whose status is `Published` and whose `featured` state is true, or explicit `featured_language_ids` that currently satisfy both conditions.
3. **UnderReview is not a rejection.** Do not use UnderReview languages as negative examples. A language sent back to review means "repair or rethink," not "learn an anti-pattern."
4. **Non-featured Published is neutral.** Published languages may be used as comparators, but never as positive evidence unless featured.
5. **Create proposed rules only.** Never call `Accept` on a TasteRule. Proposed rules are inert until the human curator accepts them.
6. **Do not recommend catalog actions.** Never propose directives that tell the owner to archive, delete, feature, unfeature, restore, or re-review existing languages. The rule must improve future generation/review behavior.
7. **Previous TasteRules are taste evidence too.** Accepted rules are already incorporated guidance and should not be duplicated. Rejected rules are negative meta-evidence about rule framings the human did not want. Proposed and Superseded rules also count as already processed for duplicate avoidance.
8. **Generalize across themes.** If evidence comes from a specific visual theme, rewrite the rule as a general design criterion. The final `rule_text` must not depend on that theme to make sense.

## Directive Shape

Every proposed `rule_text` must be a short prompt directive:

- One sentence, 8-28 words.
- Starts with an imperative cue such as `Require`, `Avoid`, `Prefer`, `Preserve`, `Make`, or `Do not`.
- Written for future creator/reviewer agents, not for the owner.
- No evidence IDs, language names, report prose, confidence labels, or archive/feature instructions.
- No theme-specific aesthetic names or motifs unless the rule is explicitly about avoiding shallow motif substitution.
- Specific enough to change generation behavior, broad enough to apply beyond one language.
- Passes the generality test: it should still make sense if applied to a completely different future language theme.

Good examples:

- `Require every new language to have a signature structure that still reads clearly without its palette.`
- `Avoid proposing a language whose only meaningful distinction from an existing one is color or font choice.`
- `Prefer concrete product rituals, artifacts, or scenes over generic dashboard composition.`

Bad examples:

- `Archive the weaker geometric language.`
- `This archived example looked worse than the featured one.`
- `The curator should review these three languages again.`

## Procedure

1. Read `/system/knowledge/design-principles.md`, `/system/knowledge/quality-standards.md`, and `/system/knowledge/feedback-log.md`.
2. Load the negative corpus:
   - If `archived_language_ids` is present, `temper.get('DesignLanguages', id)` each one and keep only status `Archived`.
   - Otherwise, call `temper.list('DesignLanguages', "Status eq 'Archived'")`, sort newest first when timestamps are available, and keep at most `limit` examples.
3. Load the positive corpus:
   - If `featured_language_ids` is present, get each one and keep only status `Published` with `featured == true`.
   - Otherwise, call `temper.list('DesignLanguages', "Status eq 'Published'")` and keep only rows where `featured` is true in fields, booleans, counters, or top-level values.
4. Load the broader comparator catalog with `temper.list('DesignLanguages', "Status eq 'Published'")`. Use non-featured Published languages only as comparators, not as positive evidence.
5. Load existing rules with `temper.list('TasteRules', '')` and group them by status:
   - `Accepted`: already-approved prompt directives. Do not duplicate them; use them as positive examples of the right rule shape and only propose adjacent refinements when new evidence clearly adds something.
   - `Rejected`: negative meta-evidence. Do not re-propose the same directive, framing, or pattern type unless the new evidence is materially different and the rationale explains why.
   - `Proposed` and `Superseded`: already processed. Avoid duplicate evidence and duplicate directive text.
   Build processed sets from non-empty `evidence_fingerprint` values and from normalized `rule_text` values across all statuses.
6. Normalize every language before analysis:
   - Use `entity_id`, `status`, `fields`, `booleans`, and `counters`.
   - Inspect `name`, `slug`, `philosophy`, `tokens`, `rules`, `layout_principles`, `guidance`, `taxonomy_ids`, `tags`, `parent_ids`, `lineage_type`, `thumbnail_asset_url`, `thumbnail_file_id`, `embodiment_asset_url`, and `embodiment_file_id`.
   - Parse JSON strings when possible; leave raw text when parsing fails.
7. Cluster the evidence before proposing rules. Do not inspect only the most obvious few examples. Build recurring failure/success clusters such as:
   - distinctness from existing languages
   - structural/layout originality
   - specificity of product world, ritual, or artifact
   - typography and hierarchy discipline
   - palette discipline and contrast
   - component/state completeness
   - embodiment execution quality
   - coherence between philosophy, tokens, rules, and artifact
   - avoidance of generic dashboard or template composition
   - shadcn/component transferability
8. Identify only evidence-backed directive candidates:
   - Negative examples: inferior duplicate, generic template, weak execution, not distinct enough, incoherent identity, broken artifact.
   - Positive examples: distinctive structure, strong signature element, high signal-to-noise, memorable typography, defensible palette, strong scene specificity.
   - Every proposed directive needs at least two evidence language IDs unless the single example is unusually decisive and the rationale says why.
   - Convert each pattern into the shortest useful prompt directive. Do not propose long analysis paragraphs as rules.
   - Run the generality test before creating it: "Would this rule improve a future language with a totally different theme?" If not, rewrite it or skip it.
   - Prefer a directive that names the design test over a directive that names the evidence theme.
   - For a normal corpus of 20+ archived languages, aim for 8-14 non-duplicate proposed directives when evidence supports them. If fewer than 6 survive, the report must explain which clusters were too weak, already accepted, or rejected.
9. Draft proposed rules in memory first, without creating entities yet. For each draft, compute:
   ```
   normalized_rule_text = " ".join(rule_text.lower().split())
   evidence_fingerprint = "|".join([
       polarity,
       pattern_type,
       normalized_rule_text,
       ",".join(sorted(evidence_ids)),
   ])
   ```
   If `evidence_fingerprint` is already in the existing processed set, skip the draft and record it in the report as already processed.
   If `normalized_rule_text` is already present in Accepted, Proposed, Rejected, or Superseded rules, skip it and record which prior status caused the skip.
   If the draft resembles a Rejected rule in wording, framing, or pattern_type, skip it unless the rationale explicitly explains the new distinction.
10. Write a Markdown evidence report to `/katagami/taste-distillation/{job_id}.md` summarizing:
   - Corpus counts and filtering decisions.
   - Evidence clusters considered, including clusters that did not produce rules.
   - Proposed prompt directives and their evidence.
   - Accepted rules that were treated as already incorporated.
   - Rejected rules that suppressed similar proposals.
   - Already processed fingerprints or directive texts that were skipped.
   - Comparators used.
   - Cases where no reliable rule should be proposed.
11. For each proposed rule, create a TasteRule with the report file ID:
   ```
   rule = temper.create('TasteRules', {})
   temper.action('TasteRules', rule['entity_id'], 'Define', {
       'title': title,
       'polarity': 'positive' or 'negative',
       'pattern_type': pattern_type,
       'rule_text': rule_text,
       'rationale': rationale,
       'evidence_language_ids': json.dumps(evidence_ids),
       'comparator_language_ids': json.dumps(comparator_ids),
       'confidence': 'low' or 'medium' or 'high',
       'source_job_id': job_id,
       'report_file_id': report_file_id,
       'evidence_fingerprint': evidence_fingerprint
   })
   ```
   Use `rule_text` for the short directive only. Put the why in `rationale`.
12. Complete the job:
   ```
   temper.action('CurationJobs', job_id, 'CompleteTasteDistillation', {
       'taste_rule_ids': json.dumps(taste_rule_ids),
       'report_file_id': report_file_id,
       'output': json.dumps({
           'taste_rule_ids': taste_rule_ids,
           'report_file_id': report_file_id,
           'negative_corpus_ids': archived_ids,
           'positive_corpus_ids': featured_ids,
           'comparator_language_ids': comparator_ids,
           'evidence_clusters_considered': evidence_clusters_considered,
           'skipped_duplicate_fingerprints': skipped_duplicate_fingerprints,
           'skipped_existing_directives': skipped_existing_directives,
           'skipped_rejected_precedents': skipped_rejected_precedents
       })
   })
   temper.done("taste_distillation complete")
   ```

## Completion Contract

- `taste_rule_ids` - JSON array of proposed TasteRule entity IDs.
- `report_file_id` - PawFS file ID for the Markdown evidence report, or an empty string if writing the report failed after retries.
- `output` - JSON string containing corpus IDs, comparator IDs, and proposed rule IDs.

If the corpora are too small to infer patterns, create no TasteRules, write a report explaining the insufficiency, complete with `taste_rule_ids = "[]"`, and do not fail the job.
