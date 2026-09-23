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
/** One naming for every language: `accent_2`, `accent 2` and `accentTwo`-style keys all become kebab-case. */
export const tokenName = (key) =>
  String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

// Lengths filed as bare numbers ("scale": [4, 8, 12] or a radius of 16) are
// pixels. Written into CSS without a unit they are invalid, so every
// `padding: var(--space-4)` built on them silently did nothing: 39 of the 61
// visitor-shelf languages exported spacing that way (QA, 2026-09-23).
const LENGTH_GROUPS = new Set(["space", "radius"]);
export function asLength(value) {
  const v = flat(value).trim();
  if (v === "0") return "0";
  return /^-?\d+(\.\d+)?$/.test(v) ? `${v}px` : v;
}

export function cssVars(prefix, group) {
  const unit = (v) => (LENGTH_GROUPS.has(prefix) ? asLength(v) : flat(v));
  return Object.entries(record(group)).flatMap(([key, value]) => {
    const name = tokenName(key);
    if (Array.isArray(value)) {
      const stem = key === "scale" ? "" : `${name}-`;
      return value.flatMap((step, i) => (flat(step) ? [`  --${prefix}-${stem}${i + 1}: ${unit(step)};`] : []));
    }
    const out = tokenValue(key, value);
    return out ? [`  --${prefix}-${name}: ${unit(out)};`] : [];
  });
}

// Some languages store a value that leans on a variable the language never
// defines: Bisque's shadows are "var(--hi)" and "var(--lo-soft)", which exist
// only inside its own reference page. Pasted as-is those shadows are invalid
// CSS, so a declaration that references an undefined variable is left out and
// named in `omitted`, rather than shipped broken.
function dropUndefinedReferences(lines) {
  const defined = new Set(lines.map((l) => /^\s*(--[\w-]+)\s*:/.exec(l)?.[1]).filter(Boolean));
  const kept = [];
  const omitted = [];
  for (const line of lines) {
    const refs = [...line.matchAll(/var\(\s*(--[\w-]+)\s*(,[^)]*)?\)/g)];
    const missing = refs.filter((m) => !defined.has(m[1]) && !m[2]).map((m) => m[1]);
    if (missing.length) omitted.push({ token: /^\s*(--[\w-]+)/.exec(line)?.[1] ?? line.trim(), undefined_variables: [...new Set(missing)] });
    else kept.push(line);
  }
  return { kept, omitted };
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
    // Numbered steps are prefixed: Tailwind's own spacing.1..96 already
    // means 0.25rem steps, and a config that reused "5" for 24px silently
    // changed every p-5 and gap-5 in the project. `p-k-3` is the language's
    // third step; Tailwind's defaults are left alone.
    if (Array.isArray(value)) {
      value.forEach((step, i) => {
        if (flat(step)) out[`k-${i + 1}`] = typeof step === "number" ? `${step}px` : String(step);
      });
    } else if (flat(value)) {
      out[`k-${tokenName(key)}`] = flat(value);
    }
  }
  return out;
}

/** The whole CSS block for a set of tokens. Groups the entry does not have simply do not appear. */
export function tokensToCss(tokens) {
  const t = record(tokens);
  const typography = record(t.typography);
  const fontsUrl = typeof typography.google_fonts_url === "string" ? typography.google_fonts_url : null;
  const declarations = [
    ...cssVars("color", t.colors),
    ...cssVars("radius", t.radii),
    ...cssVars("space", t.spacing),
    ...cssVars("shadow", t.shadows),
    ...cssVars("motion", t.motion),
    ...Object.entries(record(t.ramps)).flatMap(([name, steps]) => cssVars(`ramp-${tokenName(name)}`, steps)),
    typography.body_font ? `  --font-body: ${typography.body_font};` : "",
    typography.heading_font ? `  --font-heading: ${typography.heading_font};` : "",
    typography.mono_font ? `  --font-mono: ${typography.mono_font};` : "",
    ...cssVars("type", typeMetrics(typography)),
  ].filter(Boolean);
  const { kept, omitted } = dropUndefinedReferences(declarations);
  const body = [":root {", ...kept, "}"];
  const css = (fontsUrl ? [`@import url("${fontsUrl}");`, ""] : []).concat(body).join("\n");
  return { css, fontsUrl, omitted };
}

/** The Tailwind theme extension for a set of tokens. */
export function tokensToTailwind(tokens) {
  const t = record(tokens);
  const typography = record(t.typography);
  const spacing = tailwindSpacing(t.spacing);
  // Shadows that lean on a variable the language never defines are invalid
  // outside its reference page; leave them out here as the CSS does.
  const shadows = Object.fromEntries(Object.entries(record(t.shadows)).filter(([, v]) => !/var\(\s*--[\w-]+\s*\)/.test(flat(v)) && tokenValue("shadow", v)));
  const motion = record(t.motion);
  // One naming with the CSS: kebab-case keys, lengths with units, and a
  // palette's ramps as nested colours (bg-ramp-accent-500).
  const kebab = (group, value = (v) => v) => Object.fromEntries(Object.entries(record(group)).map(([k, v]) => [tokenName(k), value(v)]));
  const colors = {
    ...kebab(t.colors),
    ...Object.fromEntries(Object.entries(record(t.ramps)).map(([name, steps]) => [`ramp-${tokenName(name)}`, kebab(steps)])),
  };
  return {
    theme: {
      extend: {
        colors,
        borderRadius: kebab(t.radii, asLength),
        fontFamily: {
          ...(typography.heading_font ? { heading: [typography.heading_font] } : {}),
          ...(typography.body_font ? { body: [typography.body_font] } : {}),
          ...(typography.mono_font ? { mono: [typography.mono_font] } : {}),
        },
        ...(Object.keys(spacing).length ? { spacing } : {}),
        ...(Object.keys(shadows).length ? { boxShadow: shadows } : {}),
        ...(motion.duration ? { transitionDuration: { k: flat(motion.duration) } } : {}),
        ...(motion.easing && flat(motion.easing).length <= 64 ? { transitionTimingFunction: { k: flat(motion.easing) } } : {}),
        ...(typography.base_size ? { fontSize: { "k-base": flat(typography.base_size) } } : {}),
      },
    },
  };
}
