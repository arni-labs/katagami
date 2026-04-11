# Phase 5: MCP + External Agent Integration — Proof Report

**Date:** 2026-04-11
**Status:** PASS

## What was tested

End-to-end agent workflow: discover → select → pull spec → generate config. Tested on isolated instance (port 3500, DB `/tmp/katagami-test/phase5.db`, tenant `katagami-test`).

## Test Setup

Created 3 Published design languages as test fixtures:
- **Neo-Bauhaus** — geometric, functional, grid-based, minimal
- **Soft Brutalism** — brutalist, warm, raw, expressive
- **Glassmorphic Luxe** — glass, translucent, gradient, dark

## Verified Flows

### 1. List Published Languages
```
GET /tdata/DesignLanguages?$filter=Status eq 'Published' → 200
  3 published languages returned
  Each with: entity_id, status, fields (name, slug, tokens, tags, lineage_type)
```

### 2. Search by Slug
```
GET /tdata/DesignLanguages → 200
  Client-side filter: slug contains "bauhaus"
  → Selected: Neo-Bauhaus (id=en-019d7de3-1090-7593-b6ca-ab753994fee8)
```

### 3. Pull Token Spec
```
GET /tdata/DesignLanguages('en-019d7de3-1090-7593-b6ca-ab753994fee8') → 200
  tokens.colors.primary = #1a1a2e
  tokens.colors.accent = #e94560
  tokens.typography.heading_font = Inter
  tokens.typography.base_size = 16px
  tokens.spacing.base = 8px
  tokens.radii.md = 4px
```

### 4. Generate Tailwind Config from Tokens
```json
{
  "theme": {
    "extend": {
      "colors": {
        "primary": "#1a1a2e",
        "secondary": "#16213e",
        "accent": "#e94560",
        "background": "#f5f5f5",
        "surface": "#ffffff",
        "text": "#1a1a2e"
      },
      "borderRadius": {
        "none": "0",
        "sm": "2px",
        "md": "4px",
        "lg": "8px"
      },
      "fontFamily": {
        "heading": ["Inter"],
        "body": ["Inter"]
      }
    }
  }
}
```

### 5. Compare Two Languages' Tokens
```
Neo-Bauhaus vs Soft Brutalism:
  colors.accent:     #e94560  vs  #ff6b35      *different
  colors.background: #f5f5f5  vs  #faf8f5      *different
  colors.primary:    #1a1a2e  vs  #2d2d2d      *different
  colors.secondary:  #16213e  vs  #f0e6d3      *different
  colors.surface:    #ffffff  vs  #ffffff       same
  colors.text:       #1a1a2e  vs  #2d2d2d      *different
```

### 6. Pull Philosophy + Rules (for component generation context)
```
Philosophy: {"values": ["function", "geometry", "clarity"], "anti_values": ["ornament", "excess"]}
Rules: {"composition": "grid-based"}
Guidance: {"do": ["use tokens"]}
```

### 7. Query Taxonomy
```
GET /tdata/Taxonomies → 200
  15 taxonomies loaded from seed data
  All in Published state (via seed actions)
```

## Architecture

```
Agent Workflow:
  ┌─────────────────────────────────────────────────────┐
  │ External Agent (Claude Code, etc.)                   │
  │                                                      │
  │ 1. GET /tdata/DesignLanguages?$filter=Published      │
  │    → browse / search by name, tags, lineage          │
  │                                                      │
  │ 2. GET /tdata/DesignLanguages('{id}')                │
  │    → pull full spec: tokens, rules, layout, guidance │
  │                                                      │
  │ 3. Parse tokens → generate Tailwind config           │
  │    Parse rules + guidance → component constraints    │
  │    Parse philosophy → design direction context       │
  │                                                      │
  │ 4. Build UI components matching the spec             │
  └───────────────────────────┬─────────────────────────┘
                              │ OData v4
                              ▼
  ┌─────────────────────────────────────────────────────┐
  │ Temper /tdata API                                    │
  │   DesignLanguages, Taxonomies, ElementManifests      │
  │   DesignElements, DesignSources, CurationJobs        │
  └─────────────────────────────────────────────────────┘

Integration Modes:
  • Direct OData:  GET /tdata/... with X-Tenant-Id header
  • Temper MCP:    temper.list(), temper.get(), temper.action()
  • Gallery UI:    http://localhost:3000 (Next.js app)
```

## Deliverables

- `AGENT_INTEGRATION.md` — complete guide with queries, token structure, MCP examples
- Gallery UI (Phase 4) — human browsing at `/`, `/language/[id]`, `/taxonomy`, `/compare`, `/lineage`
- All entity types queryable via standard OData
- Token spec structure documented and verified extractable

## Known Limitations

- OData `$filter` on JSON string fields (e.g. filtering by tag content) not supported — use client-side filtering
- Embodiment file serving requires paw-fs app installed (not available in isolated test)
- Full MCP integration requires Temper MCP server running alongside the daemon
