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

// A language's own pages name its tokens by their short names (--accent,
// --border, --bg), and some token values lean on them ("0 0 0 1px
// var(--border)"). The exports call that colour --color-border, so such a
// value would read as undefined and be dropped. These are the names a token
// value may use, the same list the finalizer accepts (token_consistency.rs):
// a clean scalar colour, radius, spacing or shadow by its short or exported
// name, a spacing or radius step (--space-2), and a ramp step. The CSS export
// points a short name at the exported variable, so it still follows a palette
// swap; the Tailwind export, which defines no variables, takes the value
// itself. A name outside the list (Bisque's --hi) stays, and is reported.
const REFERABLE = [["colors", "color"], ["radii", "radius"], ["spacing", "space"], ["shadows", "shadow"]];

function referableNames(t) {
  const names = new Map(); // "--name" -> { value, exported }
  const put = (name, value, exported) => { if (!names.has(name)) names.set(name, { value, exported }); };
  for (const [group, prefix] of REFERABLE) {
    const length = prefix === "radius" || prefix === "space";
    for (const [key, raw] of Object.entries(record(t[group]))) {
      const name = tokenName(key);
      if (Array.isArray(raw)) {
        raw.forEach((step, i) => {
          const v = length ? asLength(step) : flat(step);
          if (v && !v.includes("var(")) put(key === "scale" ? `--${prefix}-${i + 1}` : `--${prefix}-${name}-${i + 1}`, v, true);
        });
        continue;
      }
      const v = length ? asLength(raw) : flat(raw);
      if (!v || v.includes("var(")) continue;
      put(`--${prefix}-${name}`, v, true);
      put(`--${name}`, v, `--${prefix}-${name}`);
    }
  }
  for (const [ramp, steps] of Object.entries(record(t.ramps))) {
    for (const [step, raw] of Object.entries(record(steps))) {
      const v = flat(raw);
      if (v && !v.includes("var(")) put(`--ramp-${tokenName(ramp)}-${tokenName(step)}`, v, true);
    }
  }
  return names;
}

export function withOwnReferencesResolved(tokens, { forCss = false } = {}) {
  const t = record(tokens);
  const names = referableNames(t);
  if (names.size === 0) return t;
  const fix = (value) =>
    typeof value === "string"
      ? value.replace(/var\(\s*(--[\w-]+)\s*\)/g, (whole, raw) => {
          const hit = names.get(raw.toLowerCase());
          if (!hit) return whole;
          if (!forCss) return hit.value;
          // In CSS an exported name is already defined; a short one points at it.
          return hit.exported === true ? whole : `var(${hit.exported})`;
        })
      : value;
  const each = (group) =>
    Object.fromEntries(Object.entries(record(group)).map(([k, v]) => [k, Array.isArray(v) ? v.map(fix) : fix(v)]));
  return {
    ...t,
    ...(t.colors ? { colors: each(t.colors) } : {}),
    ...(t.radii ? { radii: each(t.radii) } : {}),
    ...(t.spacing ? { spacing: each(t.spacing) } : {}),
    ...(t.shadows ? { shadows: each(t.shadows) } : {}),
    ...(t.motion ? { motion: each(t.motion) } : {}),
    ...(t.ramps ? { ramps: Object.fromEntries(Object.entries(record(t.ramps)).map(([k, v]) => [k, each(v)])) } : {}),
  };
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
  const t = withOwnReferencesResolved(tokens, { forCss: true });
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

/** The Tailwind theme extension for a set of tokens, and what it left out. The
 *  config defines no CSS variables, so a value that leans on one without a
 *  fallback (Bisque's shadows are "var(--hi)") would be broken wherever it is
 *  used; it is left out and named in `omitted`, as the CSS export does. */
export function tokensToTailwindWithOmitted(tokens) {
  const t = withOwnReferencesResolved(tokens);
  const typography = record(t.typography);
  const omitted = [];
  const keep = (path) => (entry) => {
    const missing = [...flat(entry[1]).matchAll(/var\(\s*(--[\w-]+)\s*(,[^)]*)?\)/g)].filter((m) => !m[2]).map((m) => m[1]);
    if (missing.length) omitted.push({ token: `${path}.${entry[0]}`, undefined_variables: [...new Set(missing)] });
    return missing.length === 0;
  };
  const spacing = Object.fromEntries(Object.entries(tailwindSpacing(t.spacing)).filter(keep("spacing")));
  const shadows = Object.fromEntries(
    Object.entries(record(t.shadows)).filter(([, v]) => tokenValue("shadow", v)).map(([k, v]) => [tokenName(k), flat(v)]).filter(keep("boxShadow")),
  );
  const motion = record(t.motion);
  // One naming with the CSS: kebab-case keys, lengths with units, and a
  // palette's ramps as nested colours (bg-ramp-accent-500).
  const kebab = (group, path, value = (v) => v) =>
    Object.fromEntries(Object.entries(record(group)).map(([k, v]) => [tokenName(k), value(v)]).filter(keep(path)));
  const colors = {
    ...kebab(t.colors, "colors"),
    ...Object.fromEntries(Object.entries(record(t.ramps)).map(([name, steps]) => [`ramp-${tokenName(name)}`, kebab(steps, `colors.ramp-${tokenName(name)}`)])),
  };
  const config = {
    theme: {
      extend: {
        colors,
        borderRadius: kebab(t.radii, "borderRadius", asLength),
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
  return { config, omitted };
}

/** The Tailwind theme extension for a set of tokens. */
export function tokensToTailwind(tokens) {
  return tokensToTailwindWithOmitted(tokens).config;
}
