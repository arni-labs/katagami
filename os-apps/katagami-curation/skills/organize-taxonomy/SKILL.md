# Organize Taxonomy

Build, organize, relate, and deduplicate the taxonomy classification system based on the design languages that actually exist. You are the sole authority on taxonomy.

## When to Use

Job type: `organize_taxonomy`

## Process

0. **Clean up orphaned drafts**: List Draft Taxonomies. Delete any with empty Name fields (leftovers from crashed sessions).
1. **Inventory**: List all DesignLanguages (any state). Read each language's Philosophy, Tokens, and Tags. List all existing Taxonomies.
2. **Analyze the languages**: Identify the design movements, aesthetic schools, and stylistic traditions they represent.
3. **Build or update taxonomy**:
   - If no taxonomies exist: create them from scratch based on what the languages actually represent.
   - If taxonomies exist: evaluate whether they accurately describe the languages. Merge duplicates. Remove empty taxonomies that no language fits. Create new ones only if a language genuinely represents an uncovered movement.
   - Each taxonomy must have: a clear name, substantive description, characteristics JSON (`key_traits` array + `era`), and historical context.
4. **Set hierarchy** (`parent_id`): Group fine-grained taxonomies under broader parent categories where it makes sense. Don't force hierarchy — flat is fine when categories are truly peers.
5. **Set relationships** (`related_taxonomy_ids`): Connect taxonomies that share aesthetic DNA, historical lineage, or are commonly compared. Relationships must be bidirectional — if A relates to B, B must also relate to A.
6. **Deduplicate**: If two taxonomies describe essentially the same movement, merge them — keep the better-described one, delete the other, and update any language references.
7. **Classify languages**: For each language, assign 1-3 taxonomy categories via `SetTaxonomy`. Every language must be classified.
   ```python
   temper.action('DesignLanguages', lang_id, 'SetTaxonomy', {
       'taxonomy_ids': json.dumps([tax_id_1, tax_id_2])
   })
   ```
8. **Update counts**: For each taxonomy with newly linked languages, call `IncrementLanguageCount`.
   ```python
   temper.action('Taxonomies', tax_id, 'IncrementLanguageCount', {})
   ```
9. **Publish**: All new taxonomies must go through Define -> Publish. Never leave Draft taxonomies behind.
10. **Complete the job**:
    ```python
    temper.action('CurationJobs', job_id, 'Complete', {'output': json.dumps(summary)})
    temper.done("organize_taxonomy complete")
    ```

## Creating a Taxonomy

```python
tax = temper.create('Taxonomies', {})
temper.action('Taxonomies', tax['entity_id'], 'Define', {
    'name': name,
    'parent_id': parent_id_or_empty_string,
    'description': description,
    'characteristics': json.dumps({'key_traits': [...], 'era': '...'}),
    'historical_context': '...',
    'related_taxonomy_ids': json.dumps([related_id_1, related_id_2])
})
temper.action('Taxonomies', tax['entity_id'], 'Publish', {})
```

## Tooling Rules

- No `import` statements
- Available tools: `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`, `temper.write(path, content)`, `temper.read(path)`
- Always serialize JSON with `json.dumps(...)`

## Output

Job output JSON must include:
- Summary of taxonomies created, merged, deleted, and languages classified
