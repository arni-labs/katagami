# Katagami Feedback Log

Human curator feedback on design languages. Read this before starting any quality_review or synthesize job. Apply these learnings to avoid repeating past issues.

---

## 2026-04-22: [ALL] — Anti-slop design rules from human designer

The library looks "AI generated" — too playful, crypto-landing-page aesthetic. These rules fix 80% of the problem:

### Typography (50% of the design)
- **Letter-spacing: `-0.02em` on ALL text.** This is the single biggest anti-slop fix. Tight letter-spacing immediately elevates quality.
- Avoid Poppins, Montserrat, DM Sans, Roboto, Space Grotesk — these are LLM defaults.
- Any other Google Font is fair game — choose what fits the philosophy.
- A good title font + good body font = half the work done.

### Border Radius — Strict Rules
- `0px` — for serious/editorial designs
- `16px` — standard for cards and boxes
- `24px` — maximum for large containers
- `9999px` — fully rounded for pills, avatars, tags
- **NEVER use values between 24px and fully round** (no 32px, 48px, 64px)
- **NEVER mix random values** (no 8px here, 12px there, 20px elsewhere)

### What NOT to do
- No gradient buttons or gradient text
- No excessive shadows (use 1 subtle shadow level, not 3)
- No rainbow accent colors
- No "glassmorphism everywhere" — save glass for ONE hero element max

## 2026-04-29: [ALL] — Library diversity feedback from human curator

The batch of 10 languages looks too similar to each other — clean, boring, interchangeable. Root cause: overly restrictive rules killed collective diversity. Updates:

### Fonts — Freedom, not approval lists
- No approved font list. Pick ANY Google Font that embodies the philosophy.
- Body font AND heading font must be UNIQUE across the library — check what exists first.
- Mono fonts need variety too — don't default to IBM Plex Mono for everything.

### Colors & Backgrounds — Variety across the library
- No mandatory white/black backgrounds. Choose what fits the language.
- Dark backgrounds, warm tones, colored surfaces, paper textures — all valid.
- The library needs diversity: if most languages are white-background, make yours different.
- Keep WCAG AA contrast. Keep palettes focused (1-2 accents + neutrals).

### Scene Types — Stop making everything an editorial dashboard
- Vary the scene type: chat app, music player, commerce checkout, data viz, calendar, developer tools, reading app, etc.
- Different languages should feel like they power different kinds of software.

### Gradients — Use with taste, not banned
- Bad gradients (buttons, text, rainbow cards) are still wrong.
- Good gradients (subtle atmosphere, depth, warmth) are welcome when they serve the philosophy.
