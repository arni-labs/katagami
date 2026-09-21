// Turning a language's stored tokens into something you can paste: CSS custom
// properties or a Tailwind theme. Plain .mjs so the Next server and node --test
// share one copy.
//
// Two rules the first version got wrong, both found by reading real rows:
//
//  - A token is a VALUE, not a paragraph. `motion.philosophy` is a sentence
//    about how the language moves; emitted as `--motion-philosophy` it is junk
//    in a stylesheet. Prose keys and long values are left to the guidance.
//  - Languages file spacing as `{ base, scale: [4, 8, 12, …] }` and type as
//    metrics (`base_size`, `letter_spacing`, `line_height`), not as a map of
//    named steps. An exporter that only walks scalars drops the scale entirely,
//    which is how "here are the tokens" came to mean colours and two fonts.

const PROSE = new Set(["philosophy", "notes", "note", "description", "summary", "guidance", "usage", "google_fonts_url"]);
const MAX_VALUE_CHARS = 64;

const record = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const flat = (v) => (typeof v === "string" || typeof v === "number" ? String(v) : "");

/** A scalar worth emitting, or "" — prose and paragraphs belong in the guidance. */
export function tokenValue(key, value) {
  const out = flat(value);
  return !out || PROSE.has(key) || out.length > MAX_VALUE_CHARS ? "" : out;
}

/** One token group as custom properties. A list becomes 1..n; `scale` drops its own name. */
export function cssVars(prefix, group) {
  return Object.entries(record(group)).flatMap(([key, value]) => {
    if (Array.isArray(value)) {
      const stem = key === "scale" ? "" : `${key}-`;
      return value.flatMap((step, i) => (flat(step) ? [`  --${prefix}-${stem}${i + 1}: ${flat(step)};`] : []));
    }
    const out = tokenValue(key, value);
    return out ? [`  --${prefix}-${key}: ${out};`] : [];
  });
}

/** The type metrics, without the faces (which get their own --font-* names). */
export function typeMetrics(typography) {
  return Object.fromEntries(
    Object.entries(record(typography)).filter(([key]) => !key.endsWith("_font") && key !== "google_fonts_url"),
  );
}

/** Tailwind wants named steps; a language files `{ base, scale: [...] }`. A bare number is px. */
export function tailwindSpacing(spacing) {
  const out = {};
  for (const [key, value] of Object.entries(record(spacing))) {
    if (Array.isArray(value)) {
      value.forEach((step, i) => {
        if (flat(step)) out[String(i + 1)] = typeof step === "number" ? `${step}px` : String(step);
      });
    } else if (flat(value)) {
      out[key] = flat(value);
    }
  }
  return out;
}

/** The whole CSS block for a set of tokens. Groups the entry does not have simply do not appear. */
export function tokensToCss(tokens) {
  const t = record(tokens);
  const typography = record(t.typography);
  const fontsUrl = typeof typography.google_fonts_url === "string" ? typography.google_fonts_url : null;
  const body = [
    ":root {",
    ...cssVars("color", t.colors),
    ...cssVars("radius", t.radii),
    ...cssVars("space", t.spacing),
    ...cssVars("shadow", t.shadows),
    ...cssVars("motion", t.motion),
    typography.body_font ? `  --font-body: ${typography.body_font};` : "",
    typography.heading_font ? `  --font-heading: ${typography.heading_font};` : "",
    typography.mono_font ? `  --font-mono: ${typography.mono_font};` : "",
    ...cssVars("type", typeMetrics(typography)),
    "}",
  ].filter(Boolean);
  const css = (fontsUrl ? [`@import url("${fontsUrl}");`, ""] : []).concat(body).join("\n");
  return { css, fontsUrl };
}

/** The Tailwind theme extension for a set of tokens. */
export function tokensToTailwind(tokens) {
  const t = record(tokens);
  const typography = record(t.typography);
  const spacing = tailwindSpacing(t.spacing);
  const shadows = record(t.shadows);
  return {
    theme: {
      extend: {
        colors: record(t.colors),
        borderRadius: record(t.radii),
        fontFamily: {
          ...(typography.heading_font ? { heading: [typography.heading_font] } : {}),
          ...(typography.body_font ? { body: [typography.body_font] } : {}),
          ...(typography.mono_font ? { mono: [typography.mono_font] } : {}),
        },
        ...(Object.keys(spacing).length ? { spacing } : {}),
        ...(Object.keys(shadows).length ? { boxShadow: shadows } : {}),
      },
    },
  };
}
