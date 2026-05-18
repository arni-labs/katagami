# Taste Distillation

Job type: `taste_distillation`

Use this skill to convert Katagami taste signals into proposed rules. This is
not a quality-repair job and it must not mutate DesignLanguages.

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

## Procedure

1. Read `/system/knowledge/design-principles.md`, `/system/knowledge/quality-standards.md`, and `/system/knowledge/feedback-log.md`.
2. Load the negative corpus:
   - If `archived_language_ids` is present, `temper.get('DesignLanguages', id)` each one and keep only status `Archived`.
   - Otherwise, call `temper.list('DesignLanguages', "Status eq 'Archived'")`, sort newest first when timestamps are available, and keep at most `limit` examples.
3. Load the positive corpus:
   - If `featured_language_ids` is present, get each one and keep only status `Published` with `featured == true`.
   - Otherwise, call `temper.list('DesignLanguages', "Status eq 'Published'")` and keep only rows where `featured` is true in fields, booleans, counters, or top-level values.
4. Load the broader comparator catalog with `temper.list('DesignLanguages', "Status eq 'Published'")`. Use non-featured Published languages only as comparators, not as positive evidence.
5. Load existing rules with `temper.list('TasteRules', '')` and build a set of non-empty `evidence_fingerprint` values from Proposed, Accepted, Rejected, and Superseded rules. A rerun may reread the same archive and featured corpus, but it must skip any proposed rule whose evidence fingerprint has already been processed.
6. Normalize every language before analysis:
   - Use `entity_id`, `status`, `fields`, `booleans`, and `counters`.
   - Inspect `name`, `slug`, `philosophy`, `tokens`, `rules`, `layout_principles`, `guidance`, `taxonomy_ids`, `tags`, `parent_ids`, `lineage_type`, `thumbnail_asset_url`, `thumbnail_file_id`, `embodiment_asset_url`, and `embodiment_file_id`.
   - Parse JSON strings when possible; leave raw text when parsing fails.
7. Identify only evidence-backed patterns:
   - Negative examples: inferior duplicate, generic template, weak execution, not distinct enough, incoherent identity, broken artifact.
   - Positive examples: distinctive structure, strong signature element, high signal-to-noise, memorable typography, defensible palette, strong scene specificity.
   - Every proposed rule needs at least two evidence language IDs unless the single example is unusually decisive and the rationale says why.
8. Draft proposed rules in memory first, without creating entities yet. For each draft, compute:
   ```
   evidence_fingerprint = "|".join([
       polarity,
       pattern_type,
       ",".join(sorted(evidence_ids)),
   ])
   ```
   If `evidence_fingerprint` is already in the existing processed set, skip the draft and record it in the report as already processed.
9. Write a Markdown evidence report to `/katagami/taste-distillation/{job_id}.md` summarizing:
   - Corpus counts and filtering decisions.
   - Proposed negative rules and archived evidence.
   - Proposed positive rules and featured evidence.
   - Already processed fingerprints that were skipped.
   - Comparators used.
   - Cases where no reliable rule should be proposed.
10. For each proposed rule, create a TasteRule with the report file ID:
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
11. Complete the job:
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
           'skipped_duplicate_fingerprints': skipped_duplicate_fingerprints
       })
   })
   temper.done("taste_distillation complete")
   ```

## Completion Contract

- `taste_rule_ids` - JSON array of proposed TasteRule entity IDs.
- `report_file_id` - PawFS file ID for the Markdown evidence report, or an empty string if writing the report failed after retries.
- `output` - JSON string containing corpus IDs, comparator IDs, and proposed rule IDs.

If the corpora are too small to infer patterns, create no TasteRules, write a report explaining the insufficiency, complete with `taste_rule_ids = "[]"`, and do not fail the job.
