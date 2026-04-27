# Research Direction

Research design movements and aesthetic directions, find authoritative sources, and index them as DesignSource entities.

## When to Use

Job type: `source_search`

## Process

1. **Orient**: Read `/katagami/index.md` and `/katagami/log.md` if they exist. List existing DesignSources to avoid duplicates.
2. **Parse scope**: Read the job input for search scope — design movements, aesthetic directions, specific styles to research.
3. **Search broadly**: Use `temper.web_search(query)` with varied, focused queries for design system documentation, foundational articles, style guides, and reference implementations.
4. **Shortlist**: Select 5-8 high-signal, directly relevant sources per movement.
5. **Fetch and distill**: For each shortlisted source, fetch only so you can
   evaluate it and extract compact source metadata. Do **not** write the full
   fetched page to PawFS in `source_search`; source archival is a separate,
   deferred artifact step.
   ```python
   fetched = temper.web_fetch(url)
   text = fetched.get("text", "") or fetched.get("content", "")
   summary = "2-4 sentence source-specific summary"
   excerpt = text[:1200]
   metadata = {
       "query_id": query_id,
       "source_slug": source_slug,
       "summary": summary,
       "excerpt": excerpt,
       "content_length": len(text),
       "archive_status": "deferred"
   }
   ```
   Keep excerpts short enough for entity metadata. Prefer signal over volume:
   concise summaries, concrete topics, and canonical references.
6. **Create DesignSource entities**:
   ```python
   src = temper.create('DesignSources', {})
   temper.action('DesignSources', src['entity_id'], 'Submit', {
       'title': title,
       'source_type': source_type,
       'source_url': url,
       'file_id': '',
       'metadata': json.dumps(metadata)
   })
   temper.action('DesignSources', src['entity_id'], 'Index', {
       'extracted_topics': json.dumps(topics),
       'derived_language_ids': '[]'
   })
   ```
   `source_type` must be one of: "article", "style_guide", "design_system_docs", "reference"
   Use `metadata.archive_status = "deferred"` when the full page text was not
   archived. `file_id` is optional for hot-path research and should remain
   empty unless an existing file artifact already exists.
7. **Create CurationDirection entities for fan-out**: For each discovered movement, create one direction and queue it. Do not create `CurationJob` entities yourself; `QueueSynthesis` triggers the synthesize job.
   ```python
   direction_ids = []
   for movement in discovered_movements:
       name = movement if isinstance(movement, str) else movement.get('name', '')
       palette = '' if isinstance(movement, str) else movement.get('palette_direction', '')
       synth_input = json.dumps({
           'task': task_description,
           'scope': scope_description,
           'target_direction': name,
           'palette_direction': palette,
           'topic_allowlist': topics,
           'source_ids': source_ids,
           'priority': 'high',
           'query_id': query_id
       }, ensure_ascii=False)
       direction = temper.create('CurationDirections', {})
       direction_id = direction['entity_id']
       temper.action('CurationDirections', direction_id, 'Configure', {
           'query_id': query_id,
           'source_search_job_id': job_id,
           'workspace_id': workspace_id,
           'task': task_description,
           'scope': scope_description,
           'target_direction': name,
           'palette_direction': palette,
           'source_ids': json.dumps(source_ids),
           'topic_allowlist': json.dumps(topics),
           'synth_input': synth_input
       })
       temper.action('CurationDirections', direction_id, 'QueueSynthesis', {})
       direction_ids.append(direction_id)
   ```
8. **Do not update workspace files in the hot path**: Put findings in
   DesignSource metadata, CurationDirection fields, and the CurationJob
   completion output. Do not update `/katagami/log.md`, `/katagami/index.md`,
   or `/katagami/sources/*.md` during `source_search`.
9. **Complete the job**:
   ```python
   temper.action('CurationJobs', job_id, 'CompleteResearch', {
       'direction_ids': json.dumps(direction_ids)
   })
   temper.done("source_search complete")
   ```

Do NOT create synthesize jobs yourself. CurationDirection.QueueSynthesis handles that through a Temper entity trigger.

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
- Do not use `temper.write(...)` during `source_search` except for an explicit
  operator-requested artifact. Research source text belongs in compact
  DesignSource metadata during this job; full PawFS archival is deferred.
- **ALL array and object parameters MUST use `json.dumps(...)`.** NEVER use `str()` or Python repr — these produce single-quoted strings that break JSON parsing in the UI.
- `temper.web_fetch(url)` returns a structured object. Read with `fetched.get("text", "")`

## Output

Job output JSON must include:
- `task` — description of what was searched
- `scope` — scope description
- `source_ids` — array of DesignSource entity IDs
- `discovered_movements` — array of movement names found
- `topic_allowlist` — topics ready for synthesis
- `direction_ids` — array of CurationDirection entity IDs queued for synthesis
- `archive_status` — `"deferred"` unless the operator explicitly requested
  PawFS archival during this run
