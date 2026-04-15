# Research Direction

Research design movements and aesthetic directions, find authoritative sources, and index them as DesignSource entities.

## When to Use

Job type: `source_search`

## Process

1. **Orient**: Read `/katagami/index.md` and `/katagami/log.md` if they exist. List existing DesignSources to avoid duplicates.
2. **Parse scope**: Read the job input for search scope — design movements, aesthetic directions, specific styles to research.
3. **Search broadly**: Use `temper.web_search(query)` with varied, focused queries for design system documentation, foundational articles, style guides, and reference implementations.
4. **Shortlist**: Select 5-8 high-signal, directly relevant sources per movement.
5. **Fetch and store**: For each source:
   ```python
   fetched = temper.web_fetch(url)
   text = fetched.get("text", "") or fetched.get("content", "")
   result = temper.write('/katagami/sources/' + source_slug + '.md', text)
   file_id = result["file_id"]
   ```
6. **Create DesignSource entities**:
   ```python
   src = temper.create('DesignSources', {})
   temper.action('DesignSources', src['entity_id'], 'Submit', {
       'title': title,
       'source_type': source_type,
       'source_url': url,
       'file_id': file_id,
       'metadata': json.dumps(metadata)
   })
   temper.action('DesignSources', src['entity_id'], 'Index', {
       'extracted_topics': json.dumps(topics),
       'derived_language_ids': '[]'
   })
   ```
   `source_type` must be one of: "article", "style_guide", "design_system_docs", "reference"
7. **Update workspace**: Update `/katagami/log.md` and `/katagami/index.md` with findings.
8. **Complete the job**:
   ```python
   output = json.dumps({
       'task': task_description,
       'scope': scope_description,
       'source_ids': [list_of_source_entity_ids],
       'discovered_movements': [list_of_movement_names],
       'topic_allowlist': [list_of_topics_to_synthesize]
   }, ensure_ascii=False)
   temper.action('CurationJobs', job_id, 'Complete', {'output': output})
   temper.done("source_search complete")
   ```

Do NOT create synthesize jobs yourself. The system handles that.

## Source Quality Standards

- Prefer official design system documentation (Material Design, Apple HIG, IBM Carbon, etc.)
- Academic and historical references for established movements (Bauhaus, Swiss/International Style)
- Well-maintained component library docs and style guides for modern directions
- Reject SEO filler, broad hubs, category pages, and unsourced claims
- Extract canonical design principles, not just surface aesthetics
- Target 5-8 strong sources per design movement

## Tooling Rules

- No `import` statements
- Available tools: `temper.web_search(query)`, `temper.web_fetch(url)`, `temper.write(path, content)`, `temper.read(path)`, `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`
- Always serialize JSON with `json.dumps(...)`
- `temper.web_fetch(url)` returns a structured object. Read with `fetched.get("text", "")`

## Output

Job output JSON must include:
- `task` — description of what was searched
- `scope` — scope description
- `source_ids` — array of DesignSource entity IDs
- `discovered_movements` — array of movement names found
- `topic_allowlist` — topics ready for synthesis
