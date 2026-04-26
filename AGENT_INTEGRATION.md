# Katagami Agent Integration Guide

Pull rich Katagami specs or validated `DESIGN.md` exports from the Katagami library to build UIs with consistent, curated aesthetics.

## Connection

```
API:    http://<host>:3467/tdata
Tenant: rita-agents (via X-Tenant-Id header)
```

All queries use OData v4 conventions. No authentication required for read operations.

## Quick Start

### 1. List published design languages

```
GET /tdata/DesignLanguages?$filter=Status eq 'Published'
Header: X-Tenant-Id: rita-agents
```

Returns `{ "value": [...] }` — each entry has `entity_id`, `status`, `fields`, `counters`.

### 2. Search by tag or name

Filter client-side from the list response:
- `fields.name` — human name (e.g. "Neo-Bauhaus")
- `fields.slug` — URL-safe key (e.g. "neo-bauhaus")
- `fields.tags` — JSON array of tags (e.g. `["geometric", "minimal"]`)
- `fields.lineage_type` — "original", "evolution", or "remix"

### 3. Pull a spec

```
GET /tdata/DesignLanguages('<entity_id>')
Header: X-Tenant-Id: rita-agents
```

Key fields (all JSON strings, parse before use):
- `fields.tokens` — colors, typography, spacing, radii, shadows, elevation, motion
- `fields.rules` — compositional rules
- `fields.layout_principles` — density, grid, whitespace
- `fields.guidance` — do's and don'ts
- `fields.philosophy` — values, anti-values, aesthetic lineage
- `fields.design_md_file_id` — stored validated DESIGN.md artifact when review has passed
- `fields.design_md_lint_result` — JSON linter output from `@google/design.md`

The Katagami gallery exposes two agent handoff formats for each language:

- **copy Katagami spec** — the full native markdown handoff, best for rich prompting.
- **copy DESIGN.md** / **download DESIGN.md** — Google's portable format, best for agents and tooling that understand `DESIGN.md`.

The generated `DESIGN.md` contains:

- YAML front matter for machine-readable tokens
- Canonical `DESIGN.md` sections: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts
- Katagami extensions preserved as markdown sections, such as imagery direction and generative canvas guidance

Published languages are expected to have a stored `DESIGN.md` artifact that passed `@google/design.md lint` with zero errors and zero warnings.

Raw DESIGN.md route:

```
GET /language/<entity_id>/DESIGN.md
```

This returns the stored validated artifact when available, or a generated preview for drafts and languages that have not been backfilled yet.

Official format reference: https://github.com/google-labs-code/design.md

### 4. Generate a Tailwind config from tokens

```python
import json

tokens = json.loads(lang['fields']['tokens'])
colors = tokens['colors']
radii = tokens['radii']
typo = tokens['typography']

tailwind_config = {
    "theme": {
        "extend": {
            "colors": colors,
            "borderRadius": radii,
            "fontFamily": {
                "heading": [typo['heading_font']],
                "body": [typo['body_font']],
            }
        }
    }
}
```

### 5. View the embodiment (reference HTML)

```
GET /tdata/Files('<embodiment_file_id>')/$value
```

Returns self-contained HTML rendering all canonical UI elements in the language's style.

## Entity Types

| Entity | Description |
|--------|-------------|
| `DesignLanguages` | Core — complete design language specs with tokens, rules, embodiments |
| `DesignElements` | Individual canonical elements rendered per language |
| `Taxonomies` | Design movement categories (Bauhaus, Brutalism, etc.) |
| `ElementManifests` | Canonical element set definition (~61 elements + 5 compositions) |
| `DesignSources` | Raw research material indexed by agents |
| `CurationJobs` | Agent task queue for sourcing, synthesis, and review |

## Token Structure

Every published design language's `tokens` field contains:

```json
{
  "colors": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "surface": "#hex",
    "text": "#hex",
    "muted": "#hex",
    "border": "#hex",
    "error": "#hex",
    "success": "#hex",
    "warning": "#hex",
    "info": "#hex"
  },
  "typography": {
    "heading_font": "Font Name",
    "body_font": "Font Name",
    "mono_font": "Font Name",
    "base_size": "16px",
    "scale_ratio": 1.25,
    "line_height": 1.5,
    "letter_spacing": "normal"
  },
  "spacing": {
    "base": "8px",
    "scale": [4, 8, 12, 16, 24, 32, 48, 64]
  },
  "radii": {
    "none": "0",
    "sm": "2px",
    "md": "4px",
    "lg": "8px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "...",
    "md": "...",
    "lg": "..."
  },
  "motion": {
    "duration_fast": "150ms",
    "duration_normal": "300ms",
    "duration_slow": "500ms",
    "easing": "cubic-bezier(0.4, 0, 0.2, 1)"
  }
}
```

## Useful Queries

```bash
# All published languages
GET /tdata/DesignLanguages?$filter=Status eq 'Published'

# All taxonomies
GET /tdata/Taxonomies?$filter=Status eq 'Published'

# Active element manifest (what elements a language should cover)
GET /tdata/ElementManifests?$filter=Status eq 'Active'

# All languages (for lineage graph)
GET /tdata/DesignLanguages?$select=fields
```

## Temper MCP Integration

If using Temper's MCP tools (`temper.list`, `temper.get`, `temper.action`):

```python
# List published languages
langs = temper.list('rita-agents', 'DesignLanguages', "$filter=Status eq 'Published'")

# Get a specific language
lang = temper.get('rita-agents', 'DesignLanguages', entity_id)

# Pull tokens
tokens = json.loads(lang['fields']['tokens'])
```
