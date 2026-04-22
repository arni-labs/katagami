# Katagami Feedback Log

Human curator feedback on design languages. Read this before starting any quality_review or synthesize job. Apply these learnings to avoid repeating past issues.

---

## 2026-04-22: [ALL] — Anti-slop design rules from human designer

The library looks "AI generated" — too playful, crypto-landing-page aesthetic. These rules fix 80% of the problem:

### Typography (50% of the design)
- **Letter-spacing: `-0.02em` on ALL text.** This is the single biggest anti-slop fix. Tight letter-spacing immediately elevates quality.
- Use high-quality fonts: IBM Plex, Satoshi, Inter are acceptable. Avoid Poppins, Montserrat, DM Sans, Space Grotesk — these are LLM defaults.
- A good title font + good body font = half the work done.

### Colors — Start Simple
- **Full white `#FFFFFF` background** — NOT cream, NOT off-white, NOT light blue, NOT light grey. Pure white.
- **Full black `#000000` or `#121212` for dark mode** — do NOT drift into blue-greys, dark navy, or charcoal-blue. Stay true black.
- Start with black and white, add ONE accent color sparingly.

### No Gratuitous Gradients
- **Avoid gradients.** Good gradients are extremely hard. Most AI-generated gradients look dated and crypto.
- For accent color presence, use **HUGE off-viewport blobs** instead:
  ```css
  .accent-blob {
    position: absolute;
    top: -50%;
    right: -30%;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: var(--accent);
    filter: blur(120px);
    opacity: 0.15;
    pointer-events: none;
  }
  ```
  This creates subtle color wash without looking like a crypto site.

### Border Radius — Strict Rules
- `0px` — for serious/editorial designs
- `16px` — standard for cards and boxes
- `24px` — maximum for large containers
- `9999px` — fully rounded for pills, avatars, tags
- **NEVER use values between 24px and fully round** (no 32px, 48px, 64px)
- **NEVER mix random values** (no 8px here, 12px there, 20px elsewhere)

### What NOT to do
- No pastel backgrounds (cream, lavender, mint)
- No gradient buttons or gradient text
- No excessive shadows (use 1 subtle shadow level, not 3)
- No rainbow accent colors
- No "glassmorphism everywhere" — save glass for ONE hero element max
