# Synthesize Palette

Create a complete `PaletteSystem` entity: semantic color **roles**, tonal **ramps**,
**proof scenes** the palette must survive, **usage guidance**, a portable **token
export** (CSS custom properties + DTCG), and a swatch-grid **thumbnail**.

## When to Use

Job type: `synthesize_palette`

This is a terminal sourcing lane. You ATTACH artifacts; the CurationJob finalizer
verifies them, walks the PaletteSystem to `Published`, and marks the quality gate.
Do NOT call `VerifyTokensExport`, `VerifyThumbnail`, `SubmitForReview`,
`MarkQualityPassed`, `AttachPublishedAssets`, or `Publish` — those are
finalizer-owned internal actions.

## Before Starting

Read the knowledge files for taste orientation:
- `/system/knowledge/design-principles.md`
- `/system/knowledge/quality-standards.md`

Check what already exists so your palette is distinct:
```python
existing = temper.list('PaletteSystems', '')
```
Note existing hues, temperatures, and moods. Your palette must be distinct.

Load accepted taste rules and apply only `Accepted` ones:
```python
accepted_taste_rules = temper.list('TasteRules', "Status eq 'Accepted'")
```

## Execution Discipline

- Each session creates ONE palette system.
- EVERY tool call must create or populate the PaletteSystem. No exploration turns.
- Never pass `Id` or `slug` as the entity id — use the returned `entity_id`; keep
  the slug only in the `slug` field.

## SPEC PHASE

```python
created_ids = []
slug = 'muted-hobonichi-ink'
name = 'Muted Hobonichi Ink'
ps = temper.create('PaletteSystems', {})
eid = ps['entity_id']
created_ids.append(eid)
```

**Core — the palette's identity.** A palette IS its **signature** (1–4 key colors,
`signature[0]` = the **primary accent**, the star) + its **neutral ground**, with a
small **semantic** accessory and a **mood**. Lead with the signature; the neutrals
are most of what's seen; semantic is functional, NOT identity.

```python
signature = [{"hex": "#7c6f57", "name": "Ochre ink"}]   # [0] = primary accent (the star); 1-4 colors
neutrals  = {"bg": "#f4f1ea", "surface": "#fbfaf6", "text": "#2b2a26", "muted": "#8a857a", "border": "#d9d4c7"}
semantic  = {"success": "#5b6f52", "warning": "#b8893f", "error": "#a4503f", "info": "#4f6470"}
mood      = {"temperature": "warm", "key_hue": "ochre", "summary": "Muted, inky, paper-warm."}
temper.action('PaletteSystems', eid, 'SetCore', {
    'signature': json.dumps(signature, ensure_ascii=False),
    'neutrals':  json.dumps(neutrals, ensure_ascii=False),
    'semantic':  json.dumps(semantic, ensure_ascii=False),
    'mood':      json.dumps(mood, ensure_ascii=False),
})

# flat color map used by the token export + thumbnail below
flat = {**neutrals, "accent": signature[0]["hex"], **semantic}
```

**Contrast is enforced deterministically by the finalizer** — `text`↔`surface` and
`text`↔`bg` must clear WCAG AA (≥ 4.5:1), and the primary accent must clear ≥ 3.0:1
on `surface`, or the palette is rejected back to you. Pick colors accordingly.

**Ramps** — a tonal scale (50..950) for at least `accent` and a `neutral` ramp.
Each step a real hex, monotonic in lightness.

```python
ramps = {
    "neutral": {"50": "#fbfaf6", "100": "#f0ece2", "300": "#d2ccbd", "500": "#8a857a", "700": "#4d4a43", "900": "#2b2a26"},
    "accent":  {"50": "#efe9dd", "300": "#c3b291", "500": "#7c6f57", "700": "#5a503e", "900": "#332d22"}
}
temper.action('PaletteSystems', eid, 'SetRamps', {'ramps': json.dumps(ramps, ensure_ascii=False)})
```

**Proof scenes** — the canonical scenes this palette must survive, as a JSON list.
Use exactly these three keys so the studio can render them: `tinted-ui`, `chart`,
`gradient`. Each entry maps role/ramp references to where they apply.

```python
proof_scenes = [
    {"key": "tinted-ui", "uses": {"bg": "bg", "surface": "surface", "text": "text", "accent": "accent", "border": "border"}},
    {"key": "chart", "series": ["accent.500", "info", "success", "warning", "error"], "grid": "border", "label": "muted"},
    {"key": "gradient", "stops": ["accent.300", "accent.500", "accent.900"]}
]
temper.action('PaletteSystems', eid, 'SetProofScenes', {'proof_scenes': json.dumps(proof_scenes, ensure_ascii=False)})
```

**Usage guidance** — pairing/contrast rules. Include WCAG notes for text-on-surface
and text-on-accent.

```python
guidance = {
    "do": ["pair text on surface (AA+)", "reserve accent for one primary action"],
    "dont": ["never put muted on bg for body text", "no pure #000 / #fff"],
    "contrast": {"text_on_surface": "7.1:1", "text_on_accent": "5.2:1"}
}
temper.action('PaletteSystems', eid, 'SetUsageGuidance', {'usage_guidance': json.dumps(guidance, ensure_ascii=False)})
```

### Spec Validation Gate

Do not proceed until: `signature` has 1–4 valid hexes (`[0]` is the primary accent);
`neutrals` has bg/surface/text/muted/border; `semantic` has success/warning/error/info;
`ramps` has `neutral` + `accent` (>= 4 steps each); `proof_scenes` has the three keys;
and the contrast rules above hold (text↔surface, text↔bg ≥ 4.5:1; accent↔surface ≥ 3.0:1)
— the finalizer rejects palettes that fail.

## ARTIFACT PHASE

### Token export (portable projection)

Build a token export (CSS custom properties + a DTCG block) from the flat map and
attach it. Vars use the `--ds-*` namespace the Katagami UI themes on: `--ds-bg`,
`--ds-surface`, `--ds-text`, `--ds-muted`, `--ds-border`, `--ds-accent`, plus the
semantic `--ds-success` etc.

```python
css_lines = [f"  --ds-{k}: {v};" for k, v in flat.items()]
css = ":root {\n" + "\n".join(css_lines) + "\n}\n"
dtcg = {"$description": name, "color": {k: {"$type": "color", "$value": v} for k, v in flat.items()}}
tokens_doc = "/* " + name + " — Katagami palette tokens */\n" + css + "\n/* DTCG */\n" + json.dumps(dtcg, ensure_ascii=False, indent=2)
tokens_result = temper.write('/katagami/palettes/' + slug + '/tokens.css', tokens_doc, {'mime_type': 'text/css'})
temper.action('PaletteSystems', eid, 'AttachTokensExport', {
    'tokens_export_file_id': tokens_result['file_id'],
    'tokens_export_format_version': 'tokens-v1',
    'tokens_export_manifest': json.dumps({'keys': list(flat.keys()), 'css_var_prefix': '--ds-'}, ensure_ascii=False)
})
```

### Swatch-grid thumbnail (PIL, no browser)

Render a 600x400 swatch grid of the role colors with PIL and attach as JPEG.

```python
thumb_log = sandbox.bash("""python3 - <<'PY'
from PIL import Image, ImageDraw
roles = __ROLES__
order = ["bg","surface","text","muted","border","accent","success","warning","error","info"]
img = Image.new("RGB", (600, 400), roles.get("bg", "#ffffff"))
d = ImageDraw.Draw(img)
cols, rows = 5, 2
cw, ch = 600 // cols, 400 // rows
for i, key in enumerate(order):
    x, y = (i % cols) * cw, (i // cols) * ch
    d.rectangle([x, y, x + cw, y + ch], fill=roles.get(key, "#888888"))
img.save("/tmp/palette_thumb.jpg", "JPEG", quality=80)
print("thumb ok")
PY""".replace("__ROLES__", json.dumps(flat, ensure_ascii=False)))
assert 'thumb ok' in thumb_log, thumb_log
thumb_bytes = sandbox.read('/tmp/palette_thumb.jpg', binary=True)
thumb_result = temper.write('/katagami/palettes/' + slug + '/thumbnail.jpg', thumb_bytes, {'mime_type': 'image/jpeg'})
temper.action('PaletteSystems', eid, 'AttachThumbnail', {'thumbnail_file_id': thumb_result['file_id']})
```

If PIL is missing, `sandbox.bash("python3 -m pip install --quiet pillow")` first.

### Lineage

```python
temper.action('PaletteSystems', eid, 'SetLineage', {'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'})
```

## Final Tool Call

```python
temper.action('CurationJobs', job_id, 'CompletePaletteSynthesis', {
    'palette_system_ids': json.dumps(created_ids),
    'output': json.dumps({'palette_system_ids': created_ids}, ensure_ascii=False)
})
temper.done("synthesize_palette complete")
```

## Tooling Rules

- The `json` helper is preloaded; use it without importing.
- ALL array/object params MUST use `json.dumps(...)`. Never `str()` / repr.
- Use `for i in range(len(items))` — no `enumerate(..., start=...)`.
- Do not fire finalizer-owned actions (Verify*, SubmitForReview, MarkQualityPassed,
  AttachPublishedAssets, Publish).
