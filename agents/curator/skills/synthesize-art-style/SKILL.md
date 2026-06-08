# Synthesize Art Style

Create a complete `ArtStyle` entity: a **medium**, a portable **prompt template**
carrying `{subject}` and `{palette}` holes, a **negative prompt**, **engine hints**,
per-slot **subject recipes**, **reference images** (the look + the mixer's
zero-generation preview material), **proof shots** (canonical subjects rendered
in-style), and a **thumbnail**.

## When to Use

Job type: `synthesize_art_style`

Terminal sourcing lane. You ATTACH artifacts; the CurationJob finalizer verifies
them and walks the ArtStyle to `Published`. Do NOT call `VerifyReferenceImages`,
`VerifyProofShots`, `VerifyThumbnail`, `SubmitForReview`, `MarkQualityPassed`,
`AttachPublishedAssets`, or `Publish` — those are finalizer-owned.

## The portable recipe is the primary artifact

An ArtStyle is a **recipe**, not a folder of images. The downstream consumer's
agent fills `{subject}` (from a UI image slot) and `{palette}` (from a PaletteSystem)
and generates the real art with whatever engine it has. So the **prompt template**
must be the highest-quality, most transferable part. The reference images and proof
shots are in-product PREVIEW material: for v1 they are rendered procedurally (PIL)
to convey the medium's grain / texture / palette discipline. A higher-fidelity image
engine can be swapped into this step later without changing the entity shape.

## Before Starting

- Read `/system/knowledge/design-principles.md` and `/system/knowledge/quality-standards.md`.
- `existing = temper.list('ArtStyles', '')` — your style must be distinct in medium and treatment.
- `accepted_taste_rules = temper.list('TasteRules', "Status eq 'Accepted'")` — apply only `Accepted`.

## Execution Discipline

- Each session creates ONE art style.
- Use the returned `entity_id`; keep the slug only in `slug`.

## SPEC PHASE

```python
created_ids = []
slug = 'risograph-spot-print'
name = 'Risograph Spot Print'
art = temper.create('ArtStyles', {})
eid = art['entity_id']
created_ids.append(eid)

temper.action('ArtStyles', eid, 'SetMedium', {'medium': 'print'})  # illustration|photography|painting|print|3d|collage|mixed
```

**Prompt template** — MUST contain the literal holes `{subject}` and `{palette}`.
Keep it engine-agnostic; put engine-specific knobs in `engine_hints`.

```python
prompt_template = "{subject}, two-color Risograph print, {palette}, coarse halftone grain, slight misregistration, matte recycled paper, flat spot inks, limited tonal range"
negative_prompt = "photorealistic, gradients, glossy, 3d render, drop shadows, busy background"
engine_hints = {
    "midjourney": "--style raw --stylize 200",
    "recraft": "style: print/risograph",
    "nano-banana": "emphasize grain + misregistration; keep to 2 spot inks from palette",
    "replicate": "low cfg, add film grain LoRA if available"
}
temper.action('ArtStyles', eid, 'SetPromptTemplate', {
    'prompt_template': prompt_template,
    'negative_prompt': negative_prompt,
    'engine_hints': json.dumps(engine_hints, ensure_ascii=False)
})
```

**Slot recipes** — per UI image-slot subject guidance (keys match the manifest
`image_slots`: `hero`, `feature-1..3`, `avatar`/`testimonial-avatar-*`,
`empty-state`, `illustration`, `brand-illustration`, `background`, `footer-bg`).

```python
slot_recipes = {
    "hero": "wide establishing scene, generous negative space",
    "feature": "single concept object, centered, iconographic",
    "avatar": "portrait bust, friendly, shoulders up",
    "empty-state": "single small object implying emptiness",
    "illustration": "single motif, clear silhouette",
    "background": "loose ambient texture, very low contrast"
}
temper.action('ArtStyles', eid, 'SetSlotRecipes', {'slot_recipes': json.dumps(slot_recipes, ensure_ascii=False)})

temper.action('ArtStyles', eid, 'SetGuidance', {'guidance': json.dumps({
    "do": ["limit to 2-3 spot inks", "let grain show", "embrace misregistration"],
    "dont": ["smooth gradients", "photoreal detail", "more than 3 inks"]
}, ensure_ascii=False)})
```

## ARTIFACT PHASE — reference + proof images (real generation)

Generate **real, on-style images** with the curator's image engine — do NOT ship
procedural placeholders. Produce one **wide hero** (full-bleed; used as the
landing's `--hero-image`) plus 3–4 **proof shots** across subjects (portrait,
landscape, object, pattern) that prove the style transfers. Build each prompt from
the recipe: `{subject}` per shot + the medium + a representative palette + the
negative prompt. Write each to PawFS and attach the file ids (hero first in the
reference list). Only if no image engine is available in the sandbox, fall back to
the procedural PIL renderer below:

```python
sandbox.bash("python3 -m pip install --quiet pillow")
gen_log = sandbox.bash("""python3 - <<'PY'
import random, math
from PIL import Image, ImageDraw, ImageFilter
random.seed(7)
INKS = [(40,52,84), (196,84,73)]   # two spot inks
PAPER = (244, 240, 230)

def grain(img, amt=22):
    px = img.load(); w,h = img.size
    for _ in range((w*h)//6):
        x,y = random.randint(0,w-1), random.randint(0,h-1)
        r,g,b = px[x,y]
        d = random.randint(-amt, amt)
        px[x,y] = (max(0,min(255,r+d)), max(0,min(255,g+d)), max(0,min(255,b+d)))
    return img

def tile(subject, w=512, h=512):
    img = Image.new("RGB",(w,h),PAPER); d = ImageDraw.Draw(img)
    if subject=="portrait":
        d.ellipse([w*.3,h*.25,w*.7,h*.7], fill=INKS[0]); d.ellipse([w*.32,h*.6,w*.68,h*1.1], fill=INKS[1])
    elif subject=="landscape":
        d.rectangle([0,h*.6,w,h], fill=INKS[0]); d.ellipse([w*.6,h*.12,w*.85,h*.37], fill=INKS[1])
    elif subject=="object":
        d.rectangle([w*.3,h*.3,w*.7,h*.7], fill=INKS[1]); d.ellipse([w*.4,h*.18,w*.6,h*.38], fill=INKS[0])
    else:  # pattern / reference swatch
        for gx in range(0,w,46):
            for gy in range(0,h,46):
                d.ellipse([gx,gy,gx+30,gy+30], fill=INKS[(gx//46+gy//46)%2])
    # misregistration: offset one ink channel slightly
    img = grain(img, 18)
    return img

for nm in ["ref-1","ref-2","ref-3"]:
    tile("pattern").save(f"/tmp/{nm}.jpg","JPEG",quality=82)
for subj in ["portrait","landscape","object","pattern"]:
    tile(subj).save(f"/tmp/proof-{subj}.jpg","JPEG",quality=82)
print("art images ok")
PY""")
assert 'art images ok' in gen_log, gen_log
```

Write each file to PawFS, then attach the id lists + manifests:

```python
ref_ids, ref_manifest = [], []
for nm in ["ref-1","ref-2","ref-3"]:
    b = sandbox.read(f'/tmp/{nm}.jpg', binary=True)
    r = temper.write(f'/katagami/art-styles/{slug}/{nm}.jpg', b, {'mime_type': 'image/jpeg'})
    ref_ids.append(r['file_id']); ref_manifest.append({'file_id': r['file_id'], 'role': 'reference', 'aspect': '1:1'})
temper.action('ArtStyles', eid, 'AttachReferenceImages', {
    'reference_image_file_ids': json.dumps(ref_ids),
    'reference_manifest': json.dumps({'items': ref_manifest}, ensure_ascii=False)
})

proof_ids, proof_manifest = [], []
for subj in ["portrait","landscape","object","pattern"]:
    b = sandbox.read(f'/tmp/proof-{subj}.jpg', binary=True)
    r = temper.write(f'/katagami/art-styles/{slug}/proof-{subj}.jpg', b, {'mime_type': 'image/jpeg'})
    proof_ids.append(r['file_id']); proof_manifest.append({'file_id': r['file_id'], 'subject': subj})
temper.action('ArtStyles', eid, 'AttachProofShots', {
    'proof_shots_file_ids': json.dumps(proof_ids),
    'proof_shots_manifest': json.dumps({'items': proof_manifest}, ensure_ascii=False)
})

# Thumbnail: reuse the first reference, resized to 600x400
thumb_log = sandbox.bash("""python3 - <<'PY'
from PIL import Image
Image.open('/tmp/ref-1.jpg').resize((600,400)).save('/tmp/art_thumb.jpg','JPEG',quality=80)
print('thumb ok')
PY""")
assert 'thumb ok' in thumb_log, thumb_log
tb = sandbox.read('/tmp/art_thumb.jpg', binary=True)
tr = temper.write(f'/katagami/art-styles/{slug}/thumbnail.jpg', tb, {'mime_type': 'image/jpeg'})
temper.action('ArtStyles', eid, 'AttachThumbnail', {'thumbnail_file_id': tr['file_id']})

temper.action('ArtStyles', eid, 'SetLineage', {'parent_ids': '[]', 'lineage_type': 'original', 'generation_number': '0'})
```

## Final Tool Call

```python
temper.action('CurationJobs', job_id, 'CompleteArtStyleSynthesis', {
    'art_style_ids': json.dumps(created_ids),
    'output': json.dumps({'art_style_ids': created_ids}, ensure_ascii=False)
})
temper.done("synthesize_art_style complete")
```

## Tooling Rules

- `json` is preloaded; use it without importing. All array/object params via `json.dumps`.
- `prompt_template` MUST contain the literal substrings `{subject}` and `{palette}`.
- Do not fire finalizer-owned actions (Verify*, SubmitForReview, MarkQualityPassed,
  AttachPublishedAssets, Publish).
