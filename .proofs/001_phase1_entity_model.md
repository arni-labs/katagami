# Phase 1: Entity Model — Proof Report

**Date:** 2026-04-11
**Status:** PASS

## What was built

All 6 entity types for Katagami design language library, verified via Temper's L0-L3 cascade and tested end-to-end via OData API.

### katagami-commons (5 entities)
- **DesignLanguage** — Draft/UnderReview/Published/Archived lifecycle with 6 boolean guards, version counter, lineage tracking
- **DesignElement** — Pending/Rendered/Verified/Failed with rerender loop
- **DesignSource** — Submitted/Indexed/Failed (WikiSource pattern)
- **ElementManifest** — Draft/Active/Superseded with element+composition counts
- **Taxonomy** — Draft/Published/Archived with hierarchy and related taxonomy links

### katagami-curation (1 entity)
- **CurationJob** — Queued/Ready/Running/Completed/Failed (WikiJob pattern) with WASM integrations

### Cedar policies
- `design_language.cedar` — read universal, write for bootstrap/curator agents, publish for curator/human
- `taxonomy.cedar` — read universal, manage for curator, fast-track for supervisor/human
- `curation_job.cedar` — open for bootstrap/curator agents, fast-track for supervisor/human

### Seed data
- `element_manifest.toml` — 70 canonical UI elements + 5 compositions
- `taxonomy_skeleton.toml` — 15 design movements (Bauhaus through Wabi-Sabi Digital)
- `sourcing_jobs.toml` — initial source_search job

## Verification

Tested on isolated instance (port 3500, separate DB at `/tmp/katagami-test/katagami.db`, tenant `katagami-test`) to avoid interfering with live process.

### Boot verification cascade
All 6 specs passed Temper's verification cascade automatically during `install_os_app`:
```
Spec DesignElement needs verification (hash=bd184e13…), running cascade
Spec DesignLanguage needs verification (hash=f2a0ae5b…), running cascade
Spec DesignSource needs verification (hash=a9c6e2da…), running cascade
Spec ElementManifest needs verification (hash=7400c9e4…), running cascade
Spec Taxonomy needs verification (hash=f5c4c7a6…), running cascade
OsApp(katagami-commons) specs bootstrapped for tenant: ["DesignElement", "DesignLanguage", "DesignSource", "ElementManifest", "Taxonomy"]
Spec CurationJob needs verification (hash=80dd5f89…), running cascade
OsApp(katagami-curation) specs bootstrapped for tenant: ["CurationJob"]
```

### OData entity creation
```bash
# All 6 entity types create successfully
POST /tdata/DesignLanguages    → 200, status: Draft
POST /tdata/DesignElements     → 200, status: Pending
POST /tdata/DesignSources      → 200, status: Submitted
POST /tdata/CurationJobs       → 200, status: Queued
POST /tdata/Taxonomies         → 200, status: Draft
POST /tdata/ElementManifests   → (seed data, status: Active)
```

### DesignLanguage full lifecycle test
```
1. POST .../Katagami.SetName          → Draft (fields: name, slug set)
2. POST .../Katagami.WritePhilosophy  → Draft (has_philosophy: true)
3. POST .../Katagami.SetTokens        → Draft (has_tokens: true)
4. POST .../Katagami.SetRules         → Draft (has_rules: true)
5. POST .../Katagami.SetLayout        → Draft (has_layout: true)
6. POST .../Katagami.SetGuidance      → Draft (has_guidance: true)
7. POST .../Katagami.AttachEmbodiment → Draft (has_embodiment: true)
8. POST .../Katagami.SubmitForReview  → UnderReview (all 6 guards passed)
9. POST .../Katagami.Publish          → Published
10. POST .../Katagami.Revise          → UnderReview
11. POST .../Katagami.Publish         → Published (re-publish)
12. POST .../Katagami.Archive         → Archived
13. POST .../Katagami.Revise          → BLOCKED ("not valid from state 'Archived'") ✓
```

### Seed data verification
```
ElementManifests: 1 (Active, 70 elements + 5 compositions)
Taxonomies: 15 (all Published, from Bauhaus to Wabi-Sabi Digital)
CurationJobs: 1 (seed source_search job, Queued)
```

### Key finding: OData bound action URL pattern
Actions require namespace-qualified URLs: `POST .../EntitySet('key')/Namespace.ActionName`
- `/Katagami.SetName` works (parsed as BoundAction)
- `/SetName` does NOT work (parsed as NavigationProperty → MethodNotAllowed)

## Architecture

```
katagami/
├── os-apps/
│   ├── katagami-commons/
│   │   ├── app.toml                    # deps: paw-fs
│   │   └── specs/
│   │       ├── model.csdl.xml          # 5 entity types, Katagami namespace
│   │       ├── design_language.ioa.toml # 4 states, ~20 actions, 6 bool guards
│   │       ├── design_element.ioa.toml  # 4 states, 5 actions
│   │       ├── design_source.ioa.toml   # 3 states, 3 actions
│   │       ├── element_manifest.ioa.toml# 3 states, 4 actions
│   │       ├── taxonomy.ioa.toml        # 3 states, 6 actions
│   │       └── policies/
│   │           ├── design_language.cedar
│   │           └── taxonomy.cedar
│   └── katagami-curation/
│       ├── app.toml                     # deps: paw-agent, paw-fs, katagami-commons
│       ├── specs/
│       │   ├── model.csdl.xml           # CurationJob entity
│       │   ├── curation_job.ioa.toml    # 5 states, WASM integrations
│       │   └── policies/
│       │       └── curation_job.cedar
│       └── seed-data/
│           ├── element_manifest.toml    # 70+5 canonical elements
│           ├── taxonomy_skeleton.toml   # 15 design movements
│           └── sourcing_jobs.toml       # Initial search job
└── .proofs/
    └── 001_phase1_entity_model.md       # This file
```

## Known issues
- `paw-agent`, `paw-fs`, `paw-pm` etc. lack `app.toml` files in OpenPaw, so katagami's dependencies on them fail at install time. When these are standalone (without paw-* apps), temporarily set `dependencies = []` / `["katagami-commons"]` in the app.toml files.
