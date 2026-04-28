# Organize Taxonomy

Build and maintain the taxonomy — a browsable classification system that helps humans discover design languages by aesthetic movement, structural approach, and cultural lineage.

## When to Use

Job type: `organize_taxonomy`

## What Good Taxonomy Looks Like

The taxonomy is a gallery navigation system. A human browsing 40+ design languages needs to find what they're looking for quickly. Good taxonomy has these properties:

1. **Hierarchical**: Broad parent categories (3-6) with specific child subcategories. A parent like "Japanese Design Systems" contains children like "Graphic Minimalism", "Tokyo Pop Commercial", "Ukiyo-e Digital". Nobody browses by "Postmodern Expressive" — that's an art history term, not a discovery path.

2. **Specific children**: Each leaf taxonomy should describe a recognizable, distinct design movement. If you can't picture what it looks like from the name alone, it's too abstract. "Glassmorphic Frost Interfaces" is good. "Digital Futurism" is too broad.

3. **Balanced distribution**: No taxonomy should contain more than ~30% of all languages. If one bucket keeps growing, it needs subcategories. A taxonomy with 14 of 37 languages is a junk drawer, not a category.

4. **One primary, one optional secondary**: Each language gets 1 primary taxonomy (the most specific match) and optionally 1 secondary. Languages assigned to 3+ taxonomies signal that the categories are too broad. The primary taxonomy should be a leaf (child), not a parent.

5. **Useful tags**: Tags are for search and filtering, not a restatement of the taxonomy name. Good tags: `serif-led`, `high-density`, `dark-mode-first`, `editorial-grid`, `handmade-texture`. Bad tags: `modern`, `design`, `interface`, `clean`.

## Before Starting

Read the knowledge files in your workspace:
- `/system/knowledge/design-principles.md` — what makes design languages distinct
- `/system/knowledge/quality-standards.md` — quality thresholds

## Process

### Phase 1 — Inventory and Understand

0. **Clean up orphaned drafts**: List Draft Taxonomies. Delete any with empty Name fields.
1. **Read every language**: List all DesignLanguages (any state). For each, read Philosophy (`visual_character`, `summary`), Tokens (color palette, typography), and Rules (`signature_patterns`). You need to understand what each language actually IS before classifying it.
2. **Read existing taxonomies**: List all Taxonomies. Note their hierarchy, descriptions, and current language assignments.

### Phase 2 — Design the Taxonomy Tree

3. **Analyze what you have**: Look at the actual languages — what natural clusters emerge? Think about it from a user browsing a gallery:
   - What cultural/geographic traditions are represented? (Japanese, Swiss, American retro, etc.)
   - What structural approaches? (editorial/publication, illustration-led, data-dense, etc.)
   - What aesthetic eras? (brutalist, minimal, maximalist, retro, futurist, etc.)

4. **Design the tree**: Create a 2-level hierarchy.
   - **Parents** (3-6): Broad, intuitive browsing categories a non-designer would understand. These are navigation entry points, not classifications.
   - **Children** (2-5 per parent): Specific, visually distinct movements. Each child should evoke a clear aesthetic in someone familiar with design.
   - A language that doesn't fit any child cleanly may signal a missing subcategory — create it rather than forcing the language into a bad fit.

5. **Self-critique the tree before creating anything**:
   - Would a designer browsing a gallery find these categories intuitive?
   - Can you picture what each child category looks like from its name?
   - Is any single bucket holding more than ~30% of languages?
   - Are parent categories balanced (roughly similar number of children)?
   - Are there any "catch-all" categories that mean everything and nothing?
   - Revise until the tree passes all checks.

### Phase 3 — Restructure Existing Taxonomies

6. **Restructure, don't just append**: Compare your designed tree to existing taxonomies.
   - If an existing taxonomy maps cleanly to a node in your tree, update it (rename, set parent, update description).
   - If an existing taxonomy is too broad (e.g., "Postmodern Expressive" with 12 languages), break it into specific children. Archive the parent if it's now replaced by a better parent + children structure, or keep it as a parent and create new children under it.
   - If an existing taxonomy is orphaned (no languages fit), Archive it.
   - Create new taxonomies only for nodes in your tree that don't have existing matches.

7. **Set hierarchy**: Every child taxonomy MUST have a `parent_id` pointing to its parent. Parents have empty `parent_id`.
   ```python
   # Create parent
   parent = temper.create('Taxonomies', {})
   temper.action('Taxonomies', parent['entity_id'], 'Define', {
       'name': 'Japanese Design Systems',
       'parent_id': '',
       'description': 'Design languages rooted in Japanese aesthetic traditions...',
       'characteristics': json.dumps({'key_traits': [...], 'era': '...'}),
       'historical_context': '...',
       'related_taxonomy_ids': json.dumps([])
   })
   temper.action('Taxonomies', parent['entity_id'], 'Publish', {})

   # Create child under parent
   child = temper.create('Taxonomies', {})
   temper.action('Taxonomies', child['entity_id'], 'Define', {
       'name': 'Tokyo Pop Commercial',
       'parent_id': parent['entity_id'],
       'description': 'High-energy visual languages inspired by Tokyo signage...',
       'characteristics': json.dumps({'key_traits': [...], 'era': '...'}),
       'historical_context': '...',
       'related_taxonomy_ids': json.dumps([])
   })
   temper.action('Taxonomies', child['entity_id'], 'Publish', {})
   ```

8. **Set relationships** (`related_taxonomy_ids`): Connect children that share aesthetic DNA across different parents. Relationships must be bidirectional.

### Phase 4 — Classify Languages

9. **Assign every language**: Each language gets 1 primary taxonomy (a leaf/child, not a parent) and optionally 1 secondary.
   ```python
   temper.action('DesignLanguages', lang_id, 'SetTaxonomy', {
       'taxonomy_ids': json.dumps([primary_child_id])
   })
   ```

10. **Tag every language**: 5-10 specific, searchable tags per language. Tags describe visual/structural properties, not abstract art history concepts.
    ```python
    temper.action('DesignLanguages', lang_id, 'SetTags', {
        'tags': json.dumps(['serif-editorial', 'high-contrast', 'dark-mode', 'long-form-reading', 'column-grid'])
    })
    ```

11. **Update counts**: For each taxonomy with newly linked languages, call `IncrementLanguageCount`.
    ```python
    temper.action('Taxonomies', tax_id, 'IncrementLanguageCount', {})
    ```

### Phase 5 — Validate and Complete

12. **Self-check before completing**:
    - Every language has taxonomy_ids (at least 1)?
    - Every language has tags (at least 5)?
    - No taxonomy has > 30% of all languages?
    - All children have parent_ids set?
    - All taxonomies are Published (not Draft)?
    - Related taxonomy links are bidirectional?

13. **Complete the job**:
    ```python
    temper.action('CurationJobs', job_id, 'CompleteOrganization', {
        'output': json.dumps(summary, ensure_ascii=False)
    })
    temper.done("organize_taxonomy complete")
    ```

## Tooling Rules

- No `import` statements. A safe `json` helper is preloaded in the Monty REPL;
  use `json.dumps(...)` and `json.loads(...)` without importing.
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`
- **ALL array and object parameters MUST use the preloaded `json.dumps(...)`.** NEVER use `str()` or Python repr — these produce single-quoted strings that break JSON parsing in the UI. Example: `json.dumps(['a', 'b'])` -> `'["a", "b"]'` (correct), NOT `str(['a', 'b'])` -> `"['a', 'b']"` (broken).

## Output

Job output JSON must include:
- `parent_taxonomies` — list of parent taxonomy names and IDs
- `child_taxonomies` — list of child taxonomy names, IDs, and parent
- `archived` — list of archived taxonomy IDs
- `languages_classified` — count of languages that received taxonomy assignments
- `languages_tagged` — count of languages that received tags
