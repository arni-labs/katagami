---
name: katagami
description: Choose and apply a visual style from the Katagami library through its read-only MCP: find design languages, palettes and art styles for a product, build with a language's tokens and DESIGN.md, generate imagery from an art style's recipe, and check a finished page against the language. Use when someone wants a look for a product, asks what style would suit something, names a Katagami style, or is building a page that should follow one.
---

# Katagami

Katagami is a curated library of complete visual styles. Three kinds of entry:

- **design_language**: a whole UI design system: tokens, rules, layout, philosophy, and a portable `DESIGN.md`.
- **palette**: a colour system: signature colours, neutrals, ramps, semantic roles.
- **art_style**: an image or illustration style with a prompt recipe for image generation.

The MCP is read-only. Nothing here changes the library or the person's account.

## Connect

- `https://katagami.ai/mcp`: sign in with Google, the full library.
- `https://katagami.ai/mcp/open`: no sign-in, the visitor shelf: the same styles a signed-out person sees on katagami.ai.

`whoami` says which one this connection is. Results never include an entry the caller may not see. On the open shelf a call can come back `not_available_on_sample_tier`: that entry exists but is not public, so say so and offer the signed-in endpoint. `not_found` means no such entry exists anywhere; check the id or slug before telling the person anything.

## Which tool

| The person says | Call |
|---|---|
| a product, a mood, a brief ("a booking app for a vet clinic") | `ask_library` |
| "quieter", "less corporate", "warmer" about results you just gave | `ask_library` again with `refine` |
| "give me a whole look" | `compose_kit` |
| a name, a tag, a family, a medium ("something risograph") | `search_library` with the `kind` |
| "what is there?" | `describe_library` |
| "tell me about this one" | `get_library_entry` |

Ask before you search. `ask_library` judges each style's description against the sentence; `search_library` only matches names and tags, so a brief put through search finds nothing useful. `describe_library` is for learning what families, mediums and tags exist: it is not a required first call.

**Identifiers.** Every `get_*` and `check_page_against_language` takes `id_or_slug`, `id` or `slug`: any one of the three, and the `id` a result hands you is the reliable one.

## Asking well

Write the `ask_library` sentence as *what the product is and who it is for*. Do not add style words the person did not say: "clean", "modern", "minimal" steer every answer to the same place.

**Pass `kind`.** `ask_library` searches design languages and art styles together, so "what should my site look like?" can come back with art styles at the top and leave "the first one" ambiguous. For a website or an app, ask with `kind: "design_language"`. Ask separately for `art_style` when they want imagery.

**Two scores.** `fit` is the judged fit and is what the order follows. `match` is the cruder trait score the shortlist was drawn with, and the two disagree. Rank and speak in terms of `fit`, and treat both as a judge's opinion for ranking, never as a measurement of quality.

**Refining.** To adjust, call `ask_library` again with the same `query`, the `reading` from the last answer, and the change in `refine`. Pass `changes` back too once it is non-empty; on a first answer it is `""`, so leave it out. The reading is moved rather than re-read, and `moved` says which traits went where: useful for telling the person what you changed. Refine, do not start again.

## Show, then let them choose

- Show the picture and the katagami.ai link for anything you recommend. A style is a picture before it is a description.
- Offer two or three, not one. When `strange` has entries (it is empty when nothing unusual fit), include one: styles unlike the rest of the library that were still judged a fit. Say that it is the unexpected option. `strange` can be a different kind from the results, so name what each one is. In a kit answer the unexpected option is the last kit, marked `surprising`.
- **Read an entry before you recommend it.** A name and a fit score say nothing about what a language is for: one may be built for classroom and museum products, which its `philosophy` will tell you and its score will not.

## Build with a design language

1. `get_design_md` returns `{url}`: **fetch that URL**, put the file in the working directory, and follow it. (Every design-language result already carries the same link as `design_md_url`, so the call is optional.)
2. `get_design_tokens` with `format: "css"` or `"tailwind"` for the tokens themselves. The export carries every group the language stores: colours, radii, spacing, shadows, motion, the type scale and its faces: plus `fonts_url` for the webfonts, which the CSS also `@import`s at the top. Load it, or the type is wrong everywhere.
3. `get_library_entry` for the rules, do's and don'ts. `get_reference_page` is the entry's page on katagami.ai, to look at: not something you build from.
4. Honour the tokens exactly. Do not add colours, typefaces or corner radii the language does not have, and do not round a value to something nearby. A token that exists is not an instruction to use it: a language whose rules say "no borders" may still export a border colour.

## Generate images in an art style

A design language names its paired art style at `imagery_direction.pairs_with`: a **slug**, which you pass to `get_library_entry` with `kind: "art_style"`. On the open shelf that entry may be refused even though the language is public; the language's own `DESIGN.md` has a "Paired art style" section that usually carries the recipe, and otherwise say it needs sign-in.

From the art-style entry:

- `prompt_template` is the recipe. It may contain slots such as `{subject}`, `{palette}` and `{composition}`: **fill the slots**; do not paste the template and append the subject after it. Where the template has no subject slot, add the subject at the end.
- `{subject}` is what the picture is of. `{composition}` is how it is framed (a wide establishing scene, a single object with a clear silhouette, a portrait bust). `{palette}` is the colours to print in: take them from the design language the style is paired with, or from the palette in the kit, as a short list of colour names; with neither, leave the palette clause out rather than invent one.
- `slot_recipes` is keyed by where the picture will sit on a page (hero, feature, avatar, empty-state, illustration) and says what subject and composition suit each place. Use it to fill `{subject}` and `{composition}` for that place; it does not fill `{palette}`.
- `negative_prompt`, if present, goes to the image model as the negative.
- Some recipes are image-edit instructions ("Discard the source image's…") rather than text-to-image prompts. Read before you send.

Do not paraphrase a recipe, merge two recipes, or add an artist's name.

## Check before handing over

After building a page in a language, call `check_page_against_language` with the page's HTML **including its CSS**: it reads source, not pixels. It returns exact checks of colours, typefaces and radii against the tokens, and a verdict on each of the language's rules.

Treat the fails as a list of things to fix, worst first, then check again. `unclear` means the judge could not tell from the source; look at that rule yourself. A clean result is not a claim that the page is good: only that nothing was found breaking the language.

## Kits

`compose_kit` returns up to three kits: a `design_language`, a `palette` and an `art_style` judged to belong together: each with a `brief_url`: the build brief for that exact combination. Hand that URL to the agent doing the build. To choose the parts yourself, find each with `ask_library` or `search_library` and build the same URL: `https://katagami.ai/studio/BRIEF.md?ui=<design_language id>&palette=<palette id>&art=<art_style id>`.

## Do not

- Do not invent a style, a token or a rule that a tool did not return.
- Do not describe a style from its name. Read the entry.
- Do not blend two design languages into one page. Pick one; use a palette or an art style to vary it.
- Do not call the model-backed tools (`ask_library`, `compose_kit`, `check_page_against_language`) in a loop. They are rate-limited per caller; a `rate_limited` answer means wait a minute.
- Ignore `considered`, `unread`, `provisional` and `timings_ms`: they are for us, not for the person.
- For contributing a new style, this is the wrong skill and the wrong server: see `katagami-contributor`.

## Example requests

- "What should a ferry booking app for daily commuters look like?"
- "Those are too loud: quieter and warmer."
- "Give me a complete look for a zine shop: UI, colours and illustration style."
- "Find me risograph art styles."
- "Build this landing page in Almanac."
- "Does my page actually follow the language? Here is the HTML."
