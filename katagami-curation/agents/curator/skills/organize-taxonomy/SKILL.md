# Organize Taxonomy

Build and maintain THE taxonomy — a single, browsable classification of the design-language
library, so a human can find a usable style fast. The main gallery page renders this tree
("Browse by category"), so it must stay clean at all times.

## When to Use

Job type: `organize_taxonomy`

## The cardinal rule — ONE canonical tree, restructured in place

There is exactly **one** published taxonomy tree. Every run **restructures the existing
published tree** — renames, re-parents, merges, archives. **Never append a second parallel
tree.** The single worst failure mode (which has happened) is each run creating a fresh set of
near-duplicate parents ("Editorial Publishing Systems" / "Editorial & Publishing Systems" /
"Editorial and Publication Systems" …) until the gallery has 50 parents instead of 6. If you
ever find yourself about to `create` a parent whose normalized name already exists published,
**stop and update the existing one instead.**

Normalize a name before comparing: lowercase, treat `&` == `and`, drop `/`, collapse spaces.
Two taxonomies with the same normalized name are the same node — keep one, archive the other.

## What Good Taxonomy Looks Like

The taxonomy is the gallery's navigation. Properties of a good one:

1. **Hierarchical, capped**: exactly **3–6 parent** browsing families, each with **3–5 child**
   leaves. More than 6 parents is a smell — merge. A parent like "Japanese & East Asian"
   contains children like "Graphic Minimalism", "Manga Panel", "Stencil & Craft".
2. **Specific children**: each leaf names a recognizable, distinct movement you can picture
   from the name. "Glass & Soft-Depth" is good. "Digital Futurism" is too broad.
3. **Balanced**: no leaf holds more than ~30% of all languages. If a bucket keeps growing, split it.
4. **One primary, one optional secondary**: each language gets 1 primary leaf (the most
   specific match) and optionally 1 secondary. The primary must be a leaf, never a parent.
5. **Consistent naming**: Title Case; use `&` (never "and" or "/"); clear browsing labels a
   non-designer understands; **no art-history jargon** ("Postmodern Expressive"), **no test /
   build-id / date / "Draft" names**, no `… Systems`/`… Interfaces` padding on every node.
6. **Useful tags**: 5–10 specific search tags per language (`serif-led`, `dark-mode-first`,
   `editorial-grid`). Not `modern`, `clean`, `design`, `interface`.

## Before Starting

Read the knowledge files in your workspace:
- `/system/knowledge/design-principles.md` — what makes design languages distinct
- `/system/knowledge/quality-standards.md` — quality thresholds

## Process

### Phase 0 — Clean slate FIRST (do this before anything else)

The library accumulates junk; clear it before building so you restructure, not append.

0a. List ALL Taxonomies (every state). Build the set of **published** ones.
0b. **Archive every published taxonomy that is junk**: empty Name, `Test*`, `*probe*`,
    `Archived * Draft *`, build-id/date names, abstract facets ("… Posture", "Interaction
    Density"), and any node off the canonical scheme.
0c. **Dedupe**: group published taxonomies by normalized name. For each group, keep ONE
    (prefer the one with languages / a real parent), archive the rest. Do the same for
    duplicate children across different parents.
0d. After Phase 0 the only published taxonomies left are the real canonical nodes you intend
    to keep and refine. Everything else is Archived. (Drafts are invisible — ignore them.)

### Phase 1 — Inventory and Understand

1. **Read every language**: List all DesignLanguages (Published). For each, read Philosophy
   (`visual_character`, `summary`), Tokens (palette, typography), Rules (`signature_patterns`).
2. **Read the surviving taxonomies** from Phase 0: their hierarchy, descriptions, assignments.

### Phase 2 — Design the canonical tree

3. **Cluster the actual languages**: what natural groups emerge (cultural tradition, structural
   approach, aesthetic era)? Aim for the smallest set of parents that covers everything.
4. **Design a 2-level tree**: 3–6 parents, 3–5 leaves each. A language that fits no leaf cleanly
   signals a missing leaf — add it rather than forcing a bad fit.
5. **Self-critique before touching anything**: ≤6 parents? Every leaf picturable from its name?
   No bucket > ~30%? Names follow the convention (Title Case, `&`, no jargon/test names)? No two
   nodes share a normalized name? Revise until all pass.

### Phase 3 — Reconcile existing → canonical (idempotent)

6. **Match, don't multiply**: for each node in your designed tree, find the existing published
   taxonomy with the same normalized name. If it exists, **Define it again to update** (name,
   parent_id, description) — do NOT create a duplicate. Only `create` for genuinely new nodes.
   Re-running this skill must converge to the same tree, not grow it.
7. **Set hierarchy**: every child has a `parent_id`; parents have empty `parent_id`.
   ```python
   parent = temper.create('Taxonomies', {})
   temper.action('Taxonomies', parent['entity_id'], 'Define', {
       'name': 'Editorial & Print', 'parent_id': '',
       'description': '...', 'characteristics': json.dumps({'key_traits': [...]}),
       'historical_context': '...', 'related_taxonomy_ids': json.dumps([])})
   temper.action('Taxonomies', parent['entity_id'], 'Publish', {})
   child = temper.create('Taxonomies', {})
   temper.action('Taxonomies', child['entity_id'], 'Define', {
       'name': 'Civic & Institutional', 'parent_id': parent['entity_id'],
       'description': '...', 'characteristics': json.dumps({}),
       'historical_context': '', 'related_taxonomy_ids': json.dumps([])})
   temper.action('Taxonomies', child['entity_id'], 'Publish', {})
   ```
8. **Set relationships** (`related_taxonomy_ids`): connect leaves that share aesthetic DNA across
   parents. Bidirectional.

### Phase 4 — Classify Languages

9. **Assign every language**: 1 primary leaf (never a parent) + optional secondary.
   ```python
   temper.action('DesignLanguages', lang_id, 'SetTaxonomy', {'taxonomy_ids': json.dumps([primary_leaf_id])})
   ```
   `SetTaxonomy` REPLACES the list — pass the full intended set, not an append.
10. **Tag every language**: 5–10 specific searchable tags (visual/structural, not art history).
    ```python
    temper.action('DesignLanguages', lang_id, 'SetTags', {'tags': json.dumps(['serif-editorial','dark-mode','column-grid'])})
    ```
11. **Counts**: `IncrementLanguageCount` once per language linked to each leaf, so
    `language_count` matches the real assignment total.

### Phase 5 — Validate before completing (hard gate)

12. Assert ALL of these — if any fails, fix and re-check:
    - Published parents: between 3 and 6.
    - **No two published taxonomies share a normalized name.**
    - Every published leaf has a `parent_id` that resolves to a published parent.
    - Every published language has ≥1 taxonomy_id (a leaf) and ≥5 tags.
    - No leaf holds > ~30% of languages.
    - No published taxonomy is a test/junk/empty name.
    - All canonical nodes are Published (not Draft); all non-canonical are Archived.

13. **Complete**:
    ```python
    temper.action('CurationJobs', job_id, 'CompleteOrganization', {'output': json.dumps(summary, ensure_ascii=False)})
    temper.done("organize_taxonomy complete")
    ```

## Tooling Rules

- The `json` helper is preloaded — `json.dumps(...)`/`json.loads(...)` without importing.
- Tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`,
  `temper.write(path, content)`, `temper.read(path)`.
- **ALL array/object params MUST use `json.dumps(...)`** — never `str()` or repr.
- `Archive` is terminal and only valid from `Published`. Drafts can't be archived (and aren't
  shown) — leave them. When cleaning, archive Published junk; when listing, paginate fully
  (`$top`/`$skip`) — the newest canonical nodes can sit past the first page.

## Output

Job output JSON must include:
- `parent_taxonomies` — names + IDs
- `child_taxonomies` — names, IDs, parent
- `archived` — count + IDs archived this run
- `deduped` — duplicate normalized-name groups collapsed
- `languages_classified` / `languages_tagged` — counts
