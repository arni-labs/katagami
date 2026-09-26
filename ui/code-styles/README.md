# Katagami code styles

A code style is a JavaScript program that makes a picture the way its medium is made. Give it
any subject (an SVG, a line of text, an image) and it re-enacts the making: the knife cutting
paper, the drum printing one ink at a time, the bowl breaking and being mended in gold. The last
frame is the finished piece. After that it stays alive and answers the pointer.

Each style obeys rules taken from how its tradition is made, as recorded in the Katagami
encyclopedia, and a check proves it on every render.

## Use one

```html
<canvas id="c" style="width: 540px; aspect-ratio: 1"></canvas>
<script type="module">
  import * as kirie from 'https://katagami.ai/code-styles/styles/kirie/style.js';
  import { mount } from 'https://katagami.ai/code-styles/runtime/player.js';
  const svg = await (await fetch('https://katagami.ai/code-styles/subjects/cat.svg')).text();
  const player = await mount(document.getElementById('c'), kirie, { subject: { svg }, seed: 7 });
</script>
```

`mount(canvas, style, { subject, params, seed, duration, autoplay, at })` returns a player with
`play()`, `pause()`, `seek(t)`, `hold()`, `restart({ seed, params, subject })` and
`on('stage' | 'frame' | 'ready' | 'done', fn)`. A subject is `{ svg }`, `{ text }` or `{ url }`.

## The contract

A style is one ES module, `styles/<id>/style.js`, next to `RECIPE.md`, the recipe in prose:

```js
export const meta = { id, name, version, creator, licence, medium, tradition, parents, duration, summary };
export const params = { key: { type: 'number' | 'colour' | 'choice', default, min, max, step, options, label } };
export const stages = [{ id, label, share }];          // the making, in order; shares add up to 1
                                                        // (a plan may carry its own plan.stages)
export const rules = [{ id, text, source }];            // what the tradition requires
export async function plan({ subject, params, seed, W, H }) {}  // every mark, computed once
export function check(plan) {}                          // -> [{ id, pass, detail }], one per rule
export function draw(ctx, plan, t) {}                   // pure: t in [0, 1]; t = 1 is the still
export function live(ctx, plan, { time, pointer }) {}   // optional: what moves once it is made
export function press(plan, pointer) {}                 // optional: a click; returns { seed, params, replay }
```

- **Any subject.** `plan()` reads the subject only through `grid(subject, cell)` or its pixels,
  so an SVG, text or image all work. Nothing is drawn for one demo picture.
- **The making is the animation.** Stages follow the medium's real order. `draw(ctx, plan, t)`
  depends only on `plan` and `t`, so any frame can be rendered, scrubbed or recorded exactly.
- **Deterministic.** All randomness comes from `rng(seed)`. No `Math.random`, no clock, no
  network inside `plan()` or `draw()`.
- **Parameters are wired to code.** Every entry in `params` changes the output; nothing is a note.
- **Rules are checked.** Each rule names its source (an encyclopedia cell and its making line)
  and `check()` tests it on the plan.
- **Credit is data.** `meta.creator` is the person who made the style. `meta.tradition` lists
  the encyclopedia cells it comes from. `meta.parents` lists the styles it was remixed from.
  Styles come from a tradition or from their creator's own hand; they never imitate a living
  artist.

The drawing canvas is 1080 x 1080 logical pixels (`W`, `H` in `runtime/core.js`).

## Check a style

```sh
cd ui && node scripts/code-styles-render.mjs --style kirie --subject cat --t 0.3,0.6,1 --out /tmp/frames
```

Renders the frames in headless Chrome, prints each rule check and whether a second, fresh plan
draws identical pixels. It exits non-zero if a rule fails or the render is not deterministic.

`node scripts/code-styles-check.mjs` runs every style on every subject, plus settings that must
break a named rule, and fails if any style drifts. Run it before merging a style change.
