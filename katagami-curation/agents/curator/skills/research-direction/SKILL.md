# Research Direction

Research design movements and aesthetic directions, find authoritative sources, and index them as DesignSource entities.

## When to Use

Job type: `source_search`

## Process

1. **Parse scope first**: Read the job input for search scope — design movements, aesthetic directions, specific styles to research. Also read `output_type`; it must be one of `design_language`, `palette`, or `art_style`. If it is missing, infer it from the task (`palette` for palette/color/swatch/ramp requests, `art_style` for art/image/illustration style recipes, otherwise `design_language`). Do not start by reading workspace files.
2. **Bound orientation**: Do not read `/katagami/index.md` or `/katagami/log.md` during `source_search` unless the input explicitly asks for a library-wide audit. Do not call `temper.list('DesignSources', '')`. If you need duplicate protection, list only a narrow query-scoped subset, such as the current `query_id`, exact URL, or a precise title/source slug filter.
3. **Search narrowly**: Use `temper.web_search(query)` with varied, focused queries for design system documentation, foundational articles, style guides, and reference implementations. For targeted requests, run 2-4 searches total.
4. **Shortlist compactly**: Select 3-5 high-signal, directly relevant sources per targeted query. Use 5-8 only for broad survey jobs.
5. **Fetch and distill**: For targeted requests, fetch at most the top 3
   shortlisted sources. For the remaining sources, use `temper.web_search`
   title/URL/snippet metadata and set `metadata.fetch_status = "skipped"`.
   For fetched sources, fetch only so you can
   evaluate it and extract compact source metadata. Do **not** write the full
   fetched page to PawFS in `source_search`; source archival is a separate,
   deferred artifact step.
   ```python
   fetched = temper.web_fetch(url)
   if isinstance(fetched, str):
       text = fetched
   else:
       text = fetched.get("text", "") or fetched.get("content", "")
   summary = "2-4 sentence source-specific summary"
   excerpt = text[:1200]
   metadata = {
       "query_id": query_id,
       "source_slug": source_slug,
       "summary": summary,
       "excerpt": excerpt,
       "content_length": len(text),
       "fetch_status": "fetched",
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
7. **Create CurationDirection entities for fan-out**: For each discovered movement, create one direction and queue it. For targeted requests, create 1-2 directions; create more only for explicit broad-survey jobs. Do not create `CurationJob` entities yourself; `QueueSynthesis` triggers the correct lane job:
   - `design_language` → `synthesize`
   - `palette` → `synthesize_palette`
   - `art_style` → `synthesize_art_style`
   ```python
   output_type = input_data.get('output_type', '')
   if output_type not in ['design_language', 'palette', 'art_style']:
       task_l = task_description.lower()
       if any(term in task_l for term in ['palette', 'palettes', 'pallet', 'pallets', 'color', 'colour', 'swatch', 'ramp']):
           output_type = 'palette'
       elif any(term in task_l for term in ['art style', 'art styles', 'image style', 'illustration style', 'visual style', 'style transfer']):
           output_type = 'art_style'
       else:
           output_type = 'design_language'
   direction_ids = []
   for movement in discovered_movements:
       name = movement if isinstance(movement, str) else movement.get('name', '')
       palette = '' if isinstance(movement, str) else movement.get('palette_direction', '')
       movement_output_type = output_type if isinstance(movement, str) else movement.get('output_type', output_type)
       movement_synthesis_job_type = {
           'design_language': 'synthesize',
           'palette': 'synthesize_palette',
           'art_style': 'synthesize_art_style',
       }[movement_output_type]
       direction = temper.create('CurationDirections', {})
       direction_id = direction['entity_id']
       synth_input = json.dumps({
           'task': task_description,
           'scope': scope_description,
           'target_direction': name,
           'palette_direction': palette,
           'output_type': movement_output_type,
           'topic_allowlist': topics,
           'source_ids': source_ids,
           'priority': 'high',
           'query_id': query_id,
           # Carried so the synthesize agent can Quarantine THIS direction in its
           # DRIVE-TO-REVIEW loop if a language proves unfixable.
           'direction_id': direction_id
       }, ensure_ascii=False)
       temper.action('CurationDirections', direction_id, 'Configure', {
           'query_id': query_id,
           'source_search_job_id': job_id,
           'workspace_id': workspace_id,
           'task': task_description,
           'scope': scope_description,
           'target_direction': name,
           'palette_direction': palette,
           'output_type': movement_output_type,
           'synthesis_job_type': movement_synthesis_job_type,
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
9. **Complete the job**: Pass the concrete `output_type` you inferred in step 7 so
   the parent query records it (the inline `submit_creates_source_search_job` trigger
   no longer normalizes the lane — that inference now lives here, and the query's
   barrier-scope guard needs the concrete lane). `output_type` must be exactly one of
   `design_language`, `palette`, or `art_style` — never `auto`.
   ```python
   temper.action('CurationJobs', job_id, 'CompleteResearch', {
       'direction_ids': json.dumps(direction_ids),
       'output_type': output_type
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

- The `json` helper is preloaded. Use `json.dumps(...)` and `json.loads(...)`
  without importing it. Other imports are not available in the Monty REPL.
- Treat each `execute` call as self-contained. Do not rely on Python variables
  created by a previous call; persist durable data into entities or include it
  in the current script.
- Available tools: `temper.web_search(query)`, `temper.web_fetch(url)`, `temper.write(path, content)`, `temper.read(path)`, `temper.list(...)`, `temper.get(...)`, `temper.create(...)`, `temper.action(...)`
- Do not use `temper.write(...)` during `source_search` except for an explicit
  operator-requested artifact. Research source text belongs in compact
  DesignSource metadata during this job; full PawFS archival is deferred.
- Do not call `temper.list('DesignSources', '')` during `source_search`; use a
  narrow filter tied to `query_id`, exact `source_url`, or a precise slug/title.
- For targeted source-search jobs, do not fetch every shortlisted page. Fetch at
  most 3 pages and use web-search snippets for the rest.
- **ALL array and object parameters MUST use `json.dumps(...)`.** NEVER use `str()` or Python repr — these produce single-quoted strings that break JSON parsing in the UI.
- `temper.web_fetch(url)` may return a text string or a structured object. For
  string results, use the value directly; for object results, read with
  `fetched.get("text", "")`.

## Output

Job output JSON must include:
- `task` — description of what was searched
- `scope` — scope description
- `output_type` — `design_language`, `palette`, or `art_style`
- `source_ids` — array of DesignSource entity IDs
- `discovered_movements` — array of movement names or objects found; objects must preserve `output_type` when a broad query intentionally mixes lanes
- `topic_allowlist` — topics ready for synthesis
- `direction_ids` — array of CurationDirection entity IDs queued for synthesis
- `archive_status` — `"deferred"` unless the operator explicitly requested
  PawFS archival during this run
