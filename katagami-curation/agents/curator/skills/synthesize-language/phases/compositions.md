## COMPOSITION EMBODIMENTS PHASE (Landing + Dashboard) — required & gated

This is a **first-class, required phase**, gated identically to the element
embodiment. A `synthesize` / `evolve_language` job that does not attach a valid
Landing **and** Dashboard cannot pass review or publish — see the gate below.

Every design language ships **three** embodiments: the element embodiment (the
canonical-elements showcase, above) plus TWO bespoke full-screen composition
embodiments **unique to this language**, following the same `visual_character`,
`signature_patterns`, taste rules, type, layout, density, and tokens. They give
each language a real landing and a real dashboard a human can click through, and
they are what the Remix Studio recolors + fills.

- **Landing** (`/katagami/compositions/{slug}/landing.html`) — a real marketing
  landing screen. Lead with a **full-bleed hero image** at the top (today's
  trend): a section whose `background-image: var(--hero-image)` covers the
  viewport top, with the headline/CTA overlaid on a scrim. This is the priority
  placement for the single large image.
- **Dashboard** (`/katagami/compositions/{slug}/dashboard.html`) — a real app
  dashboard (sidebar nav, stat cards, a chart, a table or empty-state). UI-led;
  no hero image required.

These are **remixable**, so they MUST be tokenized — bake the language's
identity (type, layout, density, treatment) into the HTML, but read every COLOR
from CSS custom properties so the studio can recolor with any palette and inject
any art image:

```
:root{ --bg --surface --text --muted --border --accent --on-accent
       --success --warning --error --info --hero-image }
```

Define sensible defaults in `:root` (the language's own colors), use only those
vars (`var(--…)`) for color, and use `var(--hero-image)` for the landing's
full-bleed hero. Self-contained HTML, same safety rules as the element
embodiment.

### Visual verification (same rigor as the element embodiment)

Before attaching, write each composition to the sandbox, screenshot it at desktop
width, and **evaluate** it the same way you evaluated the element embodiment:
the landing's hero must read full-bleed; type, spacing, and treatment must match
this language's `visual_character`; the dashboard must look like a real product
screen, not a wireframe. Iterate until both are polished. A Swiss-grid landing
and a warm-editorial landing must look like **different products**, not one
template recolored.

```python
landing = temper.write('/katagami/compositions/' + slug + '/landing.html', landing_html)
dashboard = temper.write('/katagami/compositions/' + slug + '/dashboard.html', dashboard_html)
temper.action('DesignLanguages', eid, 'AttachCompositions', {
    'landing_file_id': landing['file_id'],
    'dashboard_file_id': dashboard['file_id'],
})
```

### Gate (finalizer-enforced — do not skip)

`AttachCompositions` is an `input` you fire; **`VerifyCompositions` is
finalizer-owned — do NOT call it.** On job completion the CurationJob finalizer:

1. Reads **both** the `landing_file_id` and `dashboard_file_id` files.
2. Rejects either that is not self-contained HTML, or that is **not tokenized**
   (no `var(--…)` color usage), or a Landing **missing the `--hero-image`** slot.
3. Dispatches `VerifyCompositions`, flipping `compositions_verified` true.

`SubmitForReview` and `Publish` both now guard on `has_compositions` +
`compositions_verified`, and the `Published` state asserts both invariants
(`PublishedRequiresCompositions`, `PublishedRequiresVerifiedCompositions`). So a
language with a missing, untokenized, or hero-less composition is held back for
remediation exactly like a bad element embodiment — it will not publish.

