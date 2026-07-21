<!-- CANONICAL SYNC NOTE: this file and the local-machine master at
     ~/.claude/skills/immersive-landing/SKILL.md (mirrored to ~/.codex and ~/.grok)
     carry the SAME law. When one changes, mirror the other in the same effort.
     This copy is the TemperPaw-portable variant: identical taste/floors; the
     environment notes are adapted to the curation app runtime. -->

# Immersive Landing — the Katagami landing standard (TemperPaw curator variant)

**This is THE way Katagami landings look.** Every landing produced by any curator agent — synthesize, evolve, regenerate — is a scroll-cinematic film built to the floors below. This skill is referenced by synthesize-language; read it in full before any landing work.

## Environment notes (TemperPaw runtime)
- The rulebook is `/system/knowledge/rules/design-language.md` (temper.read); quality bars in `/system/knowledge/quality-standards.md`.
- Files upload to the `katagami-contrib` workspace via your file tools; attach via the `KatagamiCommons.*` entity actions; list-of-id params are NATIVE arrays, object params JSON-stringified.
- Self-critique rendering uses your screenshot step (same tooling as the embodiment phase) — capture the filmstrips it requires. If your runtime genuinely cannot render a breakpoint, say so explicitly in curator_notes; never claim unverified checks.
- After every Attach*: POST the site revalidate endpoint (https://katagami.ai/api/revalidate) so curators never review stale pages.

Two modes:
- **Framework 1 — direct build**: you are building the page yourself (or writing the prompt for one builder). Use §2.
- **Framework 2 — Katagami language landing**: the page expresses a Katagami design language. Use §3 — you must DERIVE the direction from the language's soul, never reuse a storyboard.

## 1. The grammar (why these pages work — internalize before either mode)

1. **One controlling metaphor with physics.** The scroll must MEAN something the reader does: enter a portal, climb an altitude, descend under water, pull a print, develop a photo. One sentence, one verb.
2. **One material + one continuity object.** Everything is made of one material (particle cloud, ink plates, pixel blocks, fluid, paper) and one object/HUD persists through every scene (an orb, a sprite, a product render, a telemetry readout). The material IS the transition: scenes hand off *through* it.
3. **Transformation law.** Every scene transforms from geometry already on screen — letters become masks, lines become grids, numbers become scenes. Never reset the screen with a crossfade.
4. **Real state, not fades.** Things count, ignite, seal, draw themselves, respond to the pointer. Status flips exactly when an element aligns. A page that only fades in is dead.
5. **Two-extreme type scale.** Giant display (up to 25–40vw) + micro mono/caps labels. No comfortable middle — the middle is where templates live.
6. **Rationed accent, one detonation.** ≥80% monochrome (or ≤2 accents used like highlighters), then ONE climax where the accent floods. Semantic color coding (e.g. green=confirmed, violet=active).
7. **Diegetic chrome.** HUD micro-labels, live meters, page-number furniture, consistent fictional telemetry — the page as an instrument obeying its own fiction.
8. **Narrative-motivated theming.** Palette inversions and mode flips happen because the STORY demands them (dark as you enter the death zone; bookend terminal frames), never as decoration.

Technique vocabulary to draw from (names are prompts in themselves): boot-sequence pre-roll · particle-morph word swap · cursor-avatar-as-protagonist · portal scale-through · motif recursion · pinned horizontal chain-scrub · status-ignites-on-alignment · ghost-word fill-in · de-blur reveal · scroll-bound telemetry HUD · numeral-as-hero · palette-inversion-by-progress · color-block curtain · layer-explode diagram · summit payoff · hero-object relay · above→below boundary-crossing · scroll-scrubbed text fill · rule-sweep reveal · marquee understrata · chromatic accumulation payoff · frame-sequence scrollytelling (scroll→video.currentTime / plate index) · pinned-scrub-and-hold · self-drawing SVG (getTotalLength/dashoffset) · quiet-header/receding chrome · pixel/particle substrate continuity · de-rez reveal · cursor companion sprite · dither-as-gradient · flow-field narrative morph · playable-footer toy · layered headline assembly · perpetual idle micro-motion · sweep-highlight reveal · pinned-index stepper · device-composite hero.

## 2. Framework 1 — the nine-block direction (general)

Blocks 1–4 are derived per concept (this is where uniqueness lives). Blocks 5–9 are standing.

1. **Role + bar.** "Senior design engineer at an award-tier studio; the result must read as a digital fashion editorial / interactive title sequence — not a SaaS homepage." A reference may be named ONLY as "study its craft level and scroll control; do not copy layout, assets, branding, colors, copy, or animations."
2. **Metaphor.** Derived from the subject's own truth. State it as one sentence with the reader's verb.
3. **Material + continuity object.** Name both. State that scenes hand off through the material.
4. **Scroll storyboard.** 5–8 numbered scenes: composition + the MECHANISM by which each becomes the next (mask, scale-through, boundary-crossing, curtain, flood, layer-explode, ignite-on-alignment, compress-to-logo). Say what counts/draws/changes state. Name the single climax.
5. **Transformation law** (verbatim from §1.3).
6. **Restraint budget.** Quantified: accent count, monochrome %, type registers, hero type size, scrub range (0.6–1.2), motion budget ("N choreographed moments; nothing else moves").
7. **Engineering contract.** GSAP ScrollTrigger + Lenis (ALL GSAP plugins are free since Apr 2025 — SplitText, MorphSVG, DrawSVG, Flip, MotionPath, ScrambleText allowed); native CSS scroll-driven animations (`animation-timeline`, behind `@supports`) for simple reveals; View Transitions for shared-element morphs; at most ONE WebGL/Three.js moment; transform/opacity only; fonts loaded before measuring; GSAP contexts cleaned up; real DOM text (never canvas-only text); smooth scroll stays interruptible — no scroll-jacking; `prefers-reduced-motion` fallback that de-pins, disables scrub, keeps all content; mobile is art-directed, not shrunk; 60fps.
8. **Ban-list** (push the model off the statistical mean; ban second-order defaults too): indigo/violet gradients and gradient text · glassmorphism · bento grids · particle backgrounds as decoration · pill buttons · card-with-left-border-accent · emoji as icons · centered hero stack with a "✨" pill badge · fade-up-on-everything and identical staggers · hover:scale-105 everywhere · fake logos/testimonials/benchmarks · stock icons · decorative motion without narrative purpose · Inter/Geist chosen-by-default (and the fallback-to-Space-Grotesk dodge).
9. **Build order + self-audit.** Strong static composition FIRST, then choreography. Test every transition, breakpoint (1440/1280/1024/768/430/390/360), reduced-motion, and CTA. Final pass: "what is still generic here?" — fix it. Restate the constraints before each major component; drift back to the mean by the ~5th component is the #1 failure mode.

## 3. Framework 2 — Katagami language landing (derive, don't template)

Never hand a builder a storyboard: ten languages with the same skeleton read as reskins instantly. The builder DERIVES the direction from the language's DESIGN.md/soul by answering these seven questions (answers go into curator_notes so the curator can judge intent):

1. What is this language's one physical truth? (misregistration slips · phosphor scans · paper folds · ink blooms · type measures · scales shimmer)
2. Therefore what does the READER do by scrolling? One sentence, one verb (register, tune, fold, develop, ascend, descend, assemble).
3. What material is everything made of, and what single object/HUD persists through every scene? Both from the language's own imagery/signature mechanic.
4. What are 5–7 scenes, and what transformation mechanism links each pair — chosen so the mechanisms THEMSELVES express the language (a riso language wipes with ink layers arriving out of register; a CRT language re-scans between scenes; a fold language creases the viewport)?
5. Where is the single climax, and which accent detonates there?
6. What is real state on this page — what counts, ignites, seals, draws itself, or responds to the pointer, in the language's own vocabulary?
7. **Anti-collision:** name three mechanics used by other recent languages (check the gallery / review manifest); your answers to 2–4 must differ from all three.

**THE CINEMATIC FLOOR — hard requirements, not suggestions.** The landing is ONE continuous scroll-controlled film, not a page with effects. A page that fails any of these is a fail, no matter how tasteful:
1. **700–1100vh of pinned, scrubbed scenes.** 5–7 scenes, EVERY one pinned with its timeline scrubbed to scroll position (bidirectional — scroll back, it plays back). One-shot `onEnter` reveals, fade-ups, and count-up numbers are NOT choreography; they may exist only as garnish inside a pinned scene. If nothing is pinned, it is not this genre.
2. **Viewport-scale display type OVER the full-bleed hero image.** The opening scene keeps the house rule: ONE large FULL-SCREEN hero image, full-bleed (served via the --hero-image slot as always). The 18–40vw display type composes OVER/WITH that image — scrimmed or placed for legibility per the rulebook — type as architecture on the image, never a typographic hero with the image demoted to a side plate or dropped (curator 2026-07-19: "we should still have the large hero image full screen like before — we're diverging").
3. **Every transition transforms geometry already on screen** — mask, scale-through/portal, curtain, flood, morph, layer-explode — named per transition. No scroll gap between scenes, no crossfade reset, no stacked sections with whitespace between them.
4. **One continuously-alive kinetic surface in the language's material** — **WebGL/Three.js (or a GLSL canvas shader) is the default and expected**; plain-2D canvas only when the language's physics genuinely demands flatness, and never "a few drifting dots" as an alibi. Plus **cursor reactivity somewhere meaningful** (field response, magnetic elements, or an in-language custom cursor).
4b. **Image assets are part of the film.** Generate real imagery in the language's own art-style technique (hero plates, scene backgrounds, texture fields, cutout objects) and weave it through MULTIPLE scenes — parallax plates, masked reveals, scroll-scrubbed treatments, de-rez/ink-up entrances. A film told only in type and vector on flat ground wastes the language's imagery direction.
4c. **Alignment discipline under choreography.** Pinned scenes still obey the grid: consistent gutters, aligned baselines, no collisions or clipped copy at ANY breakpoint (1440/1024/768/390 each art-directed and checked). Choreography is never an excuse for a misaligned static frame — every scroll depth is a composed poster.
5. **Lenis + GSAP ScrollTrigger baseline**, scrub 0.6–1.2 — and still: transform/opacity/strokeDashoffset only, reduced-motion de-pins to the settled readable document, CDN script URLs verified reachable (curl each before shipping).
6. **Mobile is the same film re-art-directed** (shorter, vertical-native scenes) — never the desktop page stripped to static.
"Static composition first" is a BUILD ORDER (compose the scenes strong before wiring motion), never a license to ship the static page with garnish.

**THE CRAFT FLOOR — finish quality. Mechanics present but half-baked = FAIL. (Born from a real curator rejection: stretched images, text behind plates, laggy scroll, elements that flash and vanish.)**
1. **Pacing/dwell**: each pinned scene's timeline = enter ≤25% / HOLD COMPOSED ≥50% / exit ≤25% of its pin. No element's total visibility spans less than ~60vh of scroll travel — nothing may appear and immediately disappear. Consecutive scenes overlap their handoffs; no dead, starved, or fragmentary frame at ANY depth.
2. **Image integrity**: every raster keeps its natural aspect — `object-fit: cover` inside fixed-aspect boxes, never independent width+height that distort. Verify: rendered box aspect within 5% of naturalWidth/naturalHeight at every breakpoint.
3. **Occlusion discipline**: body/display text never intersects busy imagery, other text, or clips at container edges at ANY scroll depth — checked programmatically across the filmstrip (bounding-box intersection + elementFromPoint sampling), never by eyeballing a few stills.
4. **Performance**: median ≥50fps on a scripted full scroll (measure with an injected rAF-delta meter or CDP tracing); canvas devicePixelRatio capped ≤2; render loops pause when offscreen; Lenis lerp and scrub tuned together (smoothing stacked on heavy per-frame work is what reads as "uncomfortable lag"); no long tasks >120ms during scroll.
5. **Filmstrip self-critique**: capture ≥24 frames per breakpoint (~every 4% of scroll) at 1440 AND true-390 minimum; READ them as a contact sheet; every frame must compose as a poster; fix and re-capture until clean. Four stills is not verification.
6. **Motion audit**: run the `12-principles-of-animation` skill against the choreography (easing discipline, staging, follow-through) and `fixing-motion-performance` against the render path, and act on the findings.

**Embodiment note**: the embodiment page defines the style elements — every primitive in every state, the signature mechanic recoloring through components. Console/telemetry framing belongs to dashboard.html; an embodiment that reads dashboard-first is wrong even if the primitives are buried inside it.

**IN-SCENE CHOREOGRAPHY (curator directive 2026-07-19).** Scene-level transitions are not enough: the ELEMENTS inside each scene compose with their own staged beats on the scene's scrub window — kicker, headline, plates, data, marks enter as distinct, varied, in-language moments (draw, settle, ink, extrude — never one uniform stagger). A scene that arrives as a single pre-assembled block is a FAIL even when the scene-to-scene film is good. Elements keep micro-life during the hold.

**TWIN-PLATE SHADER OVERLAY (a praised, standing technique).** Generate PAIRS of nearly-identical plates (same composition, one varied state: glaze wet/dry, light angle shifted, frame offset) and cross-blend or displace them — shader mix driven by scroll or pointer, CSS blend as fallback — so imagery shimmers and breathes instead of sitting flat. Register pairs as swappable slots (--plate-Na/--plate-Nb) in the plate manifest. Pointer-reactive surfaces are identity-carrying: invest in them; the pointer effect should be one of the page's memorable moments.

**PACING CALIBRATION (curator 2026-07-20: transitions err FAST far more often than slow).** A major scene transition is a composed movement the viewer can WATCH — give it ~80–120vh of scroll at scrub 0.5–0.8, with entrances that settle on an easing tail rather than snap. If a transition reads as an afterimage, it is too fast. The opposite failure (drag) is rarer but real: holds stay alive and nothing lingers past its reading time. Calibrate every boundary individually; uniform timing is a tell.

**CONCEPT-EXPRESSIVE SHADERS (curator: "more immersiveness and shader effects and animations that convey the concept").** The ambient kinetic surface is the baseline, not the ceiling: at least one scene-level shader treatment must EXPRESS the language's physics (a displacement that folds like its paper, a reveal that develops like its print process, a blend that thaws/fires/inks like its material). Shader work that could belong to any language is decoration; shader work only THIS language could own is immersion.

**DESKTOP SCALE DISCIPLINE (curator: "buttons and texts kind of large — looks zoomed-in for older people, busy").** 17px body is a FLOOR, not a target to inflate: desktop body 17–18px, ledes ≤22px, buttons compact and professional (13–15px caps or ≤17px with restrained padding — never pillowy oversized controls), micro/mono labels 11–13px. The two-extreme scale only lands when the small end is genuinely small and the middle stays out of the way; inflated mid-scale text and controls read "zoomed-in" and busy no matter how clean the layout.

**PRAISE IS NOT A PATTERN.** When the curator praises a device on one take, that device becomes THAT language's territory — never a global mandate. Copying a praised sibling device (image-in-text, a particular field, a signature transition) into another language is collision and will be rejected. Derive from YOUR language only.

**THE SCROLL-FEEL FLOOR** (curator rejection 2026-07-19: "lagging, hard to tell if scrolling is happening"):
1. **Every wheel tick produces visible motion — continuously.** Discrete frame-swap choreography (scroll…nothing…image changes…nothing) is a FAIL even if each frame composes: between any two compositions, continuous transformation must bridge (parallax creep, field drift, partial reveals, progress). The user must FEEL scroll registering at all times. During a scene's HOLD, something must still respond to scroll — the kinetic surface drifts, the HUD progress advances, a parallax layer creeps. A pin where the frame is static while the user scrolls reads as a frozen page.
2. **Scroll progress is always legible**: a persistent progress indicator (rail, counter, meter) that moves with every tick, so the user always knows scroll is registering.
3. **Tune for real hardware, not the dev box.** Verifier fps on an M3 Max is not user experience. Budget as if for a mid-range laptop with integrated graphics: fragment shaders cheap (no full-screen fbm/noise loops per pixel per frame), particle counts modest, canvas DPR ≤1.5 on viewports ≥1440, `will-change` only on actually-animating elements, zero layout/paint properties in per-frame writes, throttle pointer handlers. Lenis lerp ≥0.12 (heavy smoothing + heavy frames = the lag feel); prefer scrub 0.5–0.8 over 1+.
4. **Pins are short enough to feel responsive**: a single pin longer than ~250vh without new composition entering feels stuck even when technically animating. The inverse also fails: a film too SHORT with heavy smoothing feels caged — total scroll stays in the 700–1100vh band and the page must visibly travel with each gesture (never "hard to scroll, barely moves").

**THE RESPONSIVE FLOOR — four art-directed breakpoints, none optional**: wide (~1920+), desktop (1440), tablet (768–1024), mobile (390). Each gets its own composed art direction — recomposed scenes, adjusted type scale, HUD placement, safe areas — never the desktop layout stretched or shrunk. Builders self-critique filmstrips at ALL FOUR; verifiers capture all four. "Desktop okayish" is a fail.

**THE IMAGE-SWAP CONTRACT (Katagami films)**: every raster art plate in the landing is consumed through a swappable CSS variable slot — `--plate-1` … `--plate-N` with the real URL as the inline default (`background-image: var(--plate-2, url(https://katagami.ai/api/file/...))`), same pattern as `--hero-image` — so the remix studio can re-skin the whole film for an art-style swap by injecting new plate URLs. Applies to every treatment the language legitimately uses — including image-in-text (`background-clip: text`) ONLY where that device belongs to THIS language (it is currently Rime's territory; the curator praised it exactly once, on Rime — using it on another language is mechanic collision, not taste) — and WebGL texture sources where feasible (read the texture URL from the CSS var or a data attribute before loading). Document the slot list (`--plate-N` → subject/role, e.g. "plate-2: full-bleed landscape, scene 3") in a `<!-- plate-manifest -->` comment near the top of the landing so a swap agent knows what each slot depicts.

Then build under the §2 blocks 5–9 engineering floor PLUS the Katagami contracts that always apply: self-contained HTML (all CSS inline; gsap/lenis/three via CDN `<script>` tags acceptable; images ONLY by absolute `https://katagami.ai/api/file/<id>` URLs), role-var swappability (consume `--bg/--surface/--text/--muted/--accent/--on-accent/--success/--warning/--error/--info` with your own defaults — NEVER self-referential `var(--x: var(--x,...))`, it is invalid CSS and silently breaks), `background-image:var(--hero-image,...)` on the hero, the house rulebook (incl. ·CH001–·CH009), radius ∈ {0,16,24,9999}, body ≥17px, ≤3 accents, no borders, light-mode default.

**Thumbnail pair invariant (three real incidents):** AttachLandingThumbnail must ALWAYS pass BOTH fields on the SAME new fid, and you must READ BACK the entity and assert `landing_thumbnail_file_id` appears inside `landing_thumbnail_asset_url` — the site reads asset_url first, so a stale asset_url advertises the old design everywhere even when file_id is fresh.

**After every attach**: flush the site cache — POST https://katagami.ai/api/revalidate, header `x-revalidate-token` = the `KATAGAMI_REVALIDATE_TOKEN` secret (via `temper_get_secret`; if unavailable, note it in curator_notes), body {"paths":["/language/<id>","/"]} — or curators will review stale pages.

**Verifier gates** (for reviewers of a language landing): (a) the metaphor is stated and the page obeys it; (b) ≥2 transition mechanisms are unique to this language's physics, not generic fades; (c) no mechanic collision with the three named prior languages; (d) reduced-motion mode intact; (e) choreography is transform/opacity (60fps-plausible); (f) true mobile render checked at real 390 width (headless Chrome clamps windows to 500px min — render inside a 390px iframe or with device emulation, or the layout you judge is not the layout users get); (g) total desktop scroll height ≥600vh; (h) ≥4 ScrollTriggers with `scrub`, pinning among them — verified LIVE by capturing the page at ~10/35/60/85% scroll depth (drive scrollTo + ScrollTrigger.update()/ticker ticks via CDP or injected script) and confirming the COMPOSITION changes materially between captures, not just opacity; (i) a `<canvas>`/WebGL context or equivalently rich kinetic system is present and running across scenes; (j) hero display type computes to ≥18vw; (k) a mousemove/pointer listener drives something visual; (l) every external script URL returns 200.

## 4. Judgment notes

- Spectacle rides on a quiet, disciplined layout underneath — generous whitespace, strict grid, restrained palette. If the base composition is weak, no choreography saves it.
- A hero-only page can be excellent with load-as-theatre (layered headline assembly + perpetual idle micro-motion) — WebGL is not required; choreography is.
- The floor/ceiling trade: art-directed variety risks empty sections; a rigid system risks sameness. Keep one consistent instrumented spine (HUD, header, telemetry) and vary the content blocks within it.
