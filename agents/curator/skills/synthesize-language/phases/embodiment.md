## EMBODIMENT PHASE

Generate a self-contained HTML file that manifests every `visual_character` trait, every `signature_pattern`, and uses the surfaces/borders/motion tokens.

### Step 1 — Write HTML to sandbox

```python
html_code = '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="..." rel="stylesheet">
  <title>Language Name</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    select, input, textarea, button { appearance: none; -webkit-appearance: none; font: inherit; color: inherit; border: none; background: none; outline: none; }
    /* Design language CSS — all layout in classes, responsive via media queries */
  </style>
</head>
<body>
  <!-- Scene-first: a real application screen -->
</body>
</html>'''
sandbox.write('/tmp/embodiment.html', html_code)
```

### Step 2 — Screenshot at three viewports

Chromium, Playwright, and Pillow are PREINSTALLED in the sandbox image — never
run pip or apt. Write render scripts to files with sandbox.write, then execute
the file (fast and reliable for scripts of any size):

```python
shot_script = """
from playwright.sync_api import sync_playwright
viewports = [
    {'name': 'desktop', 'width': 1440, 'height': 960},
    {'name': 'tablet',  'width': 768,  'height': 1024},
    {'name': 'mobile',  'width': 375,  'height': 812},
]
p = sync_playwright().start()
b = p.chromium.launch(args=['--disable-dev-shm-usage'])
for vp in viewports:
    pg = b.new_page(viewport={'width': vp['width'], 'height': vp['height']})
    pg.goto('file:///tmp/embodiment.html')
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f"/tmp/shot_{vp['name']}.png", full_page=True)
    pg.close()
b.close()
p.stop()
print('shots ok')
"""
sandbox.write('/tmp/shots.py', shot_script)
shot_log = sandbox.bash('python3 /tmp/shots.py')
assert '[exit code: 0]' in shot_log and 'shots ok' in shot_log, shot_log
```

### Step 3 — Evaluate

```python
desktop_shot = sandbox.read('/tmp/shot_desktop.png')
tablet_shot = sandbox.read('/tmp/shot_tablet.png')
mobile_shot = sandbox.read('/tmp/shot_mobile.png')
```

Check each viewport: layout integrity, all 15+ elements styled, visual_character and signature_patterns visible, typography hierarchy clear, tokens applied, responsive reflow correct, no browser defaults, professional quality.

### Step 4 — Iterate until polished

Fix issues, rewrite, re-screenshot, re-evaluate. Repeat until all three viewports look polished.

Scroll-state verification is mandatory for every page: capture full_page
screenshots AND viewport screenshots at 25/50/75/100% scroll positions
(page.evaluate scrollTo, then screenshot). A page that is empty below the
first viewport in the full_page shot FAILS — this catches pinned-scroll
films whose scenes never render without JS scrubbing. If you build a
scrolltelling landing, every scene must be verifiably visible in these
scrolled screenshots; otherwise build a statement page: full-bleed hero
plus 4-6 complete, content-rich sections that read without any JS.

This step is NOT optional and has a floor: complete AT LEAST TWO full
render -> read -> fix cycles per page before attaching anything — a first
draft is never attachment-quality. You are judged on what the page LOOKS
like, not on whether it passes gates. Concrete density check: reference-grade
landings and embodiments run 35-60 KB of HTML with rich, real content
(complete sections, working navigation, full data in dashboards, imagery);
if your page is under ~25 KB it is almost certainly underbuilt — add real
sections and content until the rendered page reads as a finished product
screen, not a sketch. Never skip rendering: if a render command fails, fix
the command (write it to a file and run the file) — do not fall back to
designing blind.

### Step 5 — Generate and verify the gallery thumbnail

After the final embodiment HTML passes all visual checks, generate a static
desktop thumbnail from the same `/tmp/embodiment.html`. This is mandatory for
`synthesize`, `regenerate_embodiment`, and `evolve_language`.

The thumbnail must be a stable desktop viewport crop, not a full-page strip:

- Capture viewport: `1440x960`
- Output file: `/tmp/thumbnail_desktop.jpg`
- Output dimensions: `600x400`
- Output format: JPEG, quality around `74`
- Stored PawFS file MIME metadata: `image/jpeg`
- Safety: disable animations/transitions before capture so the gallery image is
  deterministic.

```python
thumb_log = sandbox.bash("""python3 - <<'PY'
from playwright.sync_api import sync_playwright
from PIL import Image

safety_css = '''
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
html, body {
  max-height: 1800px !important;
  overflow: hidden !important;
}
'''

p = sync_playwright().start()
b = p.chromium.launch()
pg = b.new_page(viewport={'width': 1440, 'height': 960})
pg.goto('file:///tmp/embodiment.html')
pg.add_style_tag(content=safety_css)
pg.wait_for_timeout(1000)
pg.screenshot(path='/tmp/thumbnail_source.jpg', type='jpeg', quality=84, full_page=False)
pg.close()
b.close()
p.stop()

img = Image.open('/tmp/thumbnail_source.jpg')
img = img.resize((600, 400), Image.Resampling.LANCZOS)
img.save('/tmp/thumbnail_desktop.jpg', 'JPEG', quality=74, optimize=True)

check = Image.open('/tmp/thumbnail_desktop.jpg')
assert check.size == (600, 400), check.size
assert check.format == 'JPEG', check.format
print('thumbnail ok: 600x400 JPEG')
PY
""")
assert '[exit code: 0]' in thumb_log and 'thumbnail ok: 600x400 JPEG' in thumb_log, thumb_log
thumbnail_bytes = sandbox.read('/tmp/thumbnail_desktop.jpg', binary=True)
assert isinstance(thumbnail_bytes, dict) and thumbnail_bytes.get('__temperpaw_image') is True, 'thumbnail read must return a sandbox image result'
assert thumbnail_bytes.get('media_type') == 'image/jpeg', thumbnail_bytes
```

If thumbnail generation, resizing, or verification fails, fix the embodiment or
the screenshot command and retry. Do not attach a missing, blank, wrong-size, or
non-JPEG thumbnail. Do not call `VerifyThumbnail` directly; the CurationJob
finalizer reads the attached `thumbnail_file_id`, rejects base64 text payloads,
and marks `VerifyThumbnail`. You DO own `SubmitForReview` — see the
**DRIVE-TO-REVIEW PHASE** below: after every artifact is attached you drive each
language to `UnderReview` yourself, repairing whatever its guard names as
missing, before completing the job.

