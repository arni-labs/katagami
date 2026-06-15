import type { DesignLanguage, LaneEntity } from "@/lib/odata";
import specimenManifest from "@/data/specimen-manifest.json";

/**
 * Specimen catalog — local demo content for browsing the library at volume.
 *
 * Two sources:
 *  1. The regen "fresh batch": five fully-built languages with real
 *     embodiments + thumbnails (served from /public).
 *  2. Generated "edition" specimens: curated design houses × print
 *     editions, deterministic palettes, no network. These exist so the
 *     exploration UX (hue explorer, vibe facets, shuffle, ⌘K) can be felt
 *     the way it would with thousands of entries.
 *
 * Everything is tagged "specimen", never written to the backend, and only
 * served when NEXT_PUBLIC_KATAGAMI_DEMO_CATALOG=1.
 */

export function demoCatalogEnabled(): boolean {
  return process.env.NEXT_PUBLIC_KATAGAMI_DEMO_CATALOG === "1";
}

// ── color helpers (deterministic, no deps) ──

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const v =
    m.length === 3
      ? m.split("").map((c) => parseInt(c + c, 16) / 255)
      : [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const [r, g, b] = v;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.min(1, Math.max(0, s));
  l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60);
  const rgb = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][seg] ?? [0, 0, 0];
  return (
    "#" +
    rgb
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function adjust(hex: string, hueShift: number, satMul = 1, lightShift = 0): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h + hueShift, s * satMul, l + lightShift);
}

// ── fresh-batch specimens (real embodiments) ──

interface ManifestLanguage {
  name: string;
  slug: string;
  status?: string;
  family?: string;
  sub_movement?: string;
  summary?: string;
  tags?: string[];
  fonts?: { heading?: string; body?: string; mono?: string };
  palette?: Record<string, string>;
}

function manifestLanguages(): ManifestLanguage[] {
  const m = specimenManifest as unknown as { languages?: ManifestLanguage[] };
  return m.languages ?? [];
}

function freshBatchLanguage(lang: ManifestLanguage): DesignLanguage {
  const id = `specimen-${lang.slug}`;
  return {
    entity_id: id,
    status: "Published",
    fields: {
      Id: id,
      Status: "Published",
      name: lang.name,
      slug: lang.slug,
      philosophy: JSON.stringify({ summary: lang.summary ?? "" }),
      tokens: JSON.stringify({
        colors: lang.palette ?? {},
        typography: {
          heading_font: lang.fonts?.heading,
          body_font: lang.fonts?.body,
          mono_font: lang.fonts?.mono,
        },
      }),
      tags: JSON.stringify([...(lang.tags ?? []).slice(0, 8), "specimen"]),
      embodiment_asset_url: `/embodiments/specimens/${lang.slug}.html`,
      embodiment_format: "html",
      thumbnail_asset_url: `/thumbs/specimens/${lang.slug}.png`,
    },
    counters: {},
    booleans: {},
  };
}

// ── generated edition specimens ──

interface House {
  name: string;
  slug: string;
  summary: string;
  tags: string[];
  fonts: { heading: string; body: string };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
}

const HOUSES: House[] = [
  {
    name: "Bauhaus Poster Geometry",
    slug: "bauhaus-poster-geometry",
    summary:
      "Primary forms doing primary jobs: circle, triangle, bar. Color is structural, never decorative, and the grid is loud enough to be the illustration.",
    tags: ["bauhaus", "geometric", "poster", "primary-colors", "modernist"],
    fonts: { heading: "Archivo Black", body: "Inter" },
    palette: {
      primary: "#e63312",
      secondary: "#1d3a8f",
      accent: "#f5c518",
      background: "#f4efe6",
      surface: "#ffffff",
      text: "#191919",
    },
  },
  {
    name: "Swiss Neue Grid",
    slug: "swiss-neue-grid",
    summary:
      "Objective typography on a strict modular grid. One accent red earns its place; everything else is achieved with size, weight, and white space.",
    tags: ["swiss", "grid", "typographic", "minimal", "international-style"],
    fonts: { heading: "Helvetica Neue", body: "Helvetica Neue" },
    palette: {
      primary: "#1a1a1a",
      secondary: "#6f6f6f",
      accent: "#ff2d20",
      background: "#ffffff",
      surface: "#f5f5f4",
      text: "#111111",
    },
  },
  {
    name: "Memphis Milano Pop",
    slug: "memphis-milano-pop",
    summary:
      "Squiggles, terrazzo, and clashing pastels that refuse to apologize. Serious structure underneath lets the surface party stay legible.",
    tags: ["memphis", "pop", "playful", "pastel", "postmodern"],
    fonts: { heading: "Bricolage Grotesque", body: "Nunito" },
    palette: {
      primary: "#f2549c",
      secondary: "#00b3a4",
      accent: "#ffd232",
      background: "#fbf6ee",
      surface: "#ffffff",
      text: "#23203a",
    },
  },
  {
    name: "Art Deco Gilt",
    slug: "art-deco-gilt",
    summary:
      "Stepped frames, sunburst fans, and brass rules on midnight lacquer. Luxury achieved through repetition and symmetry rather than ornament density.",
    tags: ["art-deco", "luxury", "gold", "symmetry", "1920s"],
    fonts: { heading: "Marcellus", body: "Lora" },
    palette: {
      primary: "#c8a24b",
      secondary: "#27425b",
      accent: "#9c3c2e",
      background: "#0c1c29",
      surface: "#13283a",
      text: "#efe6d2",
    },
  },
  {
    name: "Terminal Phosphor",
    slug: "terminal-phosphor",
    summary:
      "A CRT that never went home: phosphor green type, scanline rhythm, block cursors. Information density as comfort, glow as hierarchy.",
    tags: ["terminal", "retro-computing", "monospace", "dark", "crt"],
    fonts: { heading: "IBM Plex Mono", body: "IBM Plex Mono" },
    palette: {
      primary: "#33ff66",
      secondary: "#1d8a3f",
      accent: "#ffb000",
      background: "#0a0f0a",
      surface: "#101810",
      text: "#c9f2cf",
    },
  },
  {
    name: "Botanical Field Guide",
    slug: "botanical-field-guide",
    summary:
      "Engraved-plate calm: sage inks, specimen labels, generous margins. Every element annotated like it was collected, pressed, and catalogued.",
    tags: ["botanical", "natural", "editorial", "calm", "scientific"],
    fonts: { heading: "Spectral", body: "Source Serif Pro" },
    palette: {
      primary: "#5a7253",
      secondary: "#a98c5f",
      accent: "#c45d3c",
      background: "#f7f3e8",
      surface: "#fffdf6",
      text: "#2e3528",
    },
  },
  {
    name: "Editorial Broadsheet",
    slug: "editorial-broadsheet",
    summary:
      "Six columns of confident ink. Headlines argue, captions whisper, and a single red kicker keeps the whole page honest.",
    tags: ["editorial", "newspaper", "serif", "typographic", "longform"],
    fonts: { heading: "Playfair Display", body: "PT Serif" },
    palette: {
      primary: "#19191b",
      secondary: "#5b5b60",
      accent: "#c0392b",
      background: "#faf7f0",
      surface: "#ffffff",
      text: "#1c1c1e",
    },
  },
  {
    name: "Vaporwave Arcade",
    slug: "vaporwave-arcade",
    summary:
      "Sunset gradients frozen mid-render: chrome grids, neon glyphs, and a horizon that never arrives. Nostalgia engineered with current tooling.",
    tags: ["vaporwave", "neon", "retro-future", "dark", "arcade"],
    fonts: { heading: "Orbitron", body: "Exo 2" },
    palette: {
      primary: "#ff4fd8",
      secondary: "#37d5ff",
      accent: "#ffd166",
      background: "#140b2e",
      surface: "#1d1342",
      text: "#efe7ff",
    },
  },
  {
    name: "Brutalist Concrete",
    slug: "brutalist-concrete",
    summary:
      "Raw shuttering marks left in. System fonts, exposed structure, safety-orange wayfinding — the interface as poured municipal architecture.",
    tags: ["brutalist", "raw", "monochrome", "utilitarian", "concrete"],
    fonts: { heading: "Archivo", body: "Archivo" },
    palette: {
      primary: "#3a3a3a",
      secondary: "#8c8c8c",
      accent: "#ff5f1f",
      background: "#e8e6e1",
      surface: "#f4f2ed",
      text: "#222222",
    },
  },
  {
    name: "Nordic Quiet",
    slug: "nordic-quiet",
    summary:
      "Birch light and long winters: pale blues, undyed wool neutrals, typography that speaks at library volume. Warm minimalism, never sterile.",
    tags: ["nordic", "minimal", "calm", "light", "hygge"],
    fonts: { heading: "Sora", body: "Mulish" },
    palette: {
      primary: "#5e7e9b",
      secondary: "#a8b8c4",
      accent: "#d9805f",
      background: "#f6f7f5",
      surface: "#ffffff",
      text: "#2c3640",
    },
  },
  {
    name: "Clay Pastel Toybox",
    slug: "clay-pastel-toybox",
    summary:
      "Soft-shadowed clay forms in butter, sky, and blush. Rounded everything, bouncy motion, and the durable cheer of good plastic toys.",
    tags: ["claymorphism", "pastel", "playful", "soft", "rounded"],
    fonts: { heading: "Baloo 2", body: "Quicksand" },
    palette: {
      primary: "#e58f8f",
      secondary: "#8fb8e5",
      accent: "#f2cf66",
      background: "#fdf8f2",
      surface: "#ffffff",
      text: "#4a4458",
    },
  },
  {
    name: "Ukiyo-e Tide",
    slug: "ukiyo-e-tide",
    summary:
      "Woodblock indigo, persimmon stamps, and foam-white negative space. Flat planes arranged with the patience of a printmaker's registration marks.",
    tags: ["ukiyo-e", "japanese", "woodblock", "indigo", "traditional"],
    fonts: { heading: "Shippori Mincho", body: "Noto Serif JP" },
    palette: {
      primary: "#28527a",
      secondary: "#8fb9c9",
      accent: "#e0623c",
      background: "#f5f1e6",
      surface: "#fbf8f0",
      text: "#22303a",
    },
  },
];

interface Edition {
  label: string;
  slug: string;
  tag: string;
  note: string;
  hueShift: number;
  satMul: number;
  lightShift: number;
  darkens?: boolean;
}

const EDITIONS: Edition[] = [
  { label: "First Press", slug: "first-press", tag: "first-press", note: "the house style as originally registered", hueShift: 0, satMul: 1, lightShift: 0 },
  { label: "Night Edition", slug: "night", tag: "night", note: "run on dark stock with lifted inks", hueShift: -8, satMul: 0.92, lightShift: 0.06, darkens: true },
  { label: "Coastal Run", slug: "coastal", tag: "coastal", note: "hues pulled toward sea glass and haze", hueShift: 38, satMul: 0.85, lightShift: 0.04 },
  { label: "Archive Copy", slug: "archive", tag: "archive", note: "sun-faded and slightly foxed", hueShift: 10, satMul: 0.55, lightShift: 0.07 },
  { label: "Neon Proof", slug: "neon", tag: "neon", note: "ink density pushed past spec", hueShift: -20, satMul: 1.3, lightShift: 0.02 },
  { label: "Field Notes", slug: "field", tag: "field", note: "muddied, portable, weatherproof", hueShift: 64, satMul: 0.7, lightShift: -0.02 },
  { label: "Museum Plate", slug: "museum", tag: "museum", note: "restrained for gallery lighting", hueShift: -45, satMul: 0.78, lightShift: 0.03 },
  { label: "Riso Misprint", slug: "misprint", tag: "misprint", note: "registration drifted two passes left", hueShift: 150, satMul: 1.05, lightShift: 0 },
];

function editionLanguage(house: House, ed: Edition): DesignLanguage {
  const slug = `${house.slug}-${ed.slug}`;
  const id = `specimen-${slug}`;
  const p = house.palette;
  const colors =
    ed.slug === "first-press"
      ? p
      : {
          primary: adjust(p.primary, ed.hueShift, ed.satMul, ed.lightShift),
          secondary: adjust(p.secondary, ed.hueShift, ed.satMul, ed.lightShift),
          accent: adjust(p.accent, ed.hueShift * 0.6, ed.satMul, ed.lightShift),
          background: ed.darkens
            ? adjust(p.text, 0, 0.6, -0.08)
            : adjust(p.background, ed.hueShift * 0.2, 0.9, ed.lightShift * 0.4),
          surface: ed.darkens
            ? adjust(p.text, 0, 0.6, -0.02)
            : adjust(p.surface, ed.hueShift * 0.2, 0.9, ed.lightShift * 0.4),
          text: ed.darkens ? adjust(p.background, 0, 0.4, 0.04) : p.text,
        };
  return {
    entity_id: id,
    status: "Published",
    fields: {
      Id: id,
      Status: "Published",
      name: `${house.name} · ${ed.label}`,
      slug,
      philosophy: JSON.stringify({
        summary: `${house.summary} This ${ed.label.toLowerCase()} is ${ed.note}.`,
      }),
      tokens: JSON.stringify({
        colors,
        typography: {
          heading_font: house.fonts.heading,
          body_font: house.fonts.body,
        },
      }),
      tags: JSON.stringify([...house.tags, ed.tag, "specimen"]),
    },
    counters: {},
    booleans: {},
  };
}

// ── public API ──

let cachedLanguages: DesignLanguage[] | null = null;

export function demoDesignLanguages(): DesignLanguage[] {
  if (!demoCatalogEnabled()) return [];
  if (!cachedLanguages) {
    cachedLanguages = [
      ...manifestLanguages().map(freshBatchLanguage),
      ...HOUSES.flatMap((house) => EDITIONS.map((ed) => editionLanguage(house, ed))),
    ];
  }
  return cachedLanguages;
}

export function getDemoDesignLanguage(id: string): DesignLanguage | undefined {
  if (!id.startsWith("specimen-")) return undefined;
  return demoDesignLanguages().find((l) => l.entity_id === id);
}

export function demoPaletteSystems(): LaneEntity[] {
  if (!demoCatalogEnabled()) return [];
  return HOUSES.map((house) => {
    const id = `specimen-palette-${house.slug}`;
    return {
      entity_id: id,
      status: "Published",
      fields: {
        Id: id,
        Status: "Published",
        name: `${house.name} Inks`,
        slug: `${house.slug}-inks`,
        signature: JSON.stringify([
          { hex: house.palette.primary, name: "primary" },
          { hex: house.palette.secondary, name: "secondary" },
          { hex: house.palette.accent, name: "accent" },
        ]),
        neutrals: JSON.stringify({
          paper: house.palette.background,
          surface: house.palette.surface,
          ink: house.palette.text,
        }),
        semantic: JSON.stringify({
          success: "#3d8b5f",
          warning: "#d9921f",
          danger: "#c0392b",
        }),
        mood: JSON.stringify({
          temperature: ["art-deco-gilt", "terminal-phosphor", "vaporwave-arcade"].includes(house.slug)
            ? "dark"
            : "light",
          key_hue: house.palette.primary,
          summary: house.summary.split(".")[0] + ".",
        }),
        tags: JSON.stringify([...house.tags.slice(0, 3), "specimen"]),
      },
    };
  });
}

export function getDemoPaletteSystem(id: string): LaneEntity | undefined {
  return demoPaletteSystems().find((p) => p.entity_id === id);
}

const DEMO_ART_STYLES: Array<{
  name: string;
  slug: string;
  medium: string;
  prompt: string;
  tags: string[];
}> = [
  { name: "Linocut Reduction", slug: "linocut-reduction", medium: "relief print", prompt: "bold linocut reduction print, carved texture, 3 spot colors, visible gouge marks, {subject}", tags: ["print", "carved", "bold", "specimen"] },
  { name: "Gouache Storybook", slug: "gouache-storybook", medium: "opaque paint", prompt: "flat gouache illustration, matte storybook texture, soft edges, limited warm palette, {subject}", tags: ["paint", "soft", "storybook", "specimen"] },
  { name: "Blueprint Cyanotype", slug: "blueprint-cyanotype", medium: "photographic print", prompt: "cyanotype blueprint, prussian blue ground, white technical linework, annotation labels, {subject}", tags: ["technical", "blue", "diagram", "specimen"] },
  { name: "Collage Ransom", slug: "collage-ransom", medium: "paper collage", prompt: "cut-paper collage, torn edges, mixed printed ephemera, ransom-note typography, {subject}", tags: ["collage", "punk", "texture", "specimen"] },
  { name: "Isometric Diorama", slug: "isometric-diorama", medium: "vector render", prompt: "isometric diorama, clean vector shading, miniature architectural scene, pastel lighting, {subject}", tags: ["isometric", "vector", "miniature", "specimen"] },
  { name: "Charcoal Gesture", slug: "charcoal-gesture", medium: "drawing", prompt: "loose charcoal gesture drawing, smudged tone, confident strokes, newsprint ground, {subject}", tags: ["drawing", "loose", "monochrome", "specimen"] },
  { name: "Stained Glass Mosaic", slug: "stained-glass-mosaic", medium: "glass", prompt: "stained glass panel, leaded outlines, jewel-tone light transmission, radial composition, {subject}", tags: ["glass", "jewel-tone", "ornament", "specimen"] },
  { name: "Pixel Bitmap 1-bit", slug: "pixel-bitmap-1bit", medium: "bitmap", prompt: "1-bit pixel art, dithered shading, macintosh-era bitmap, crisp silhouette, {subject}", tags: ["pixel", "retro", "monochrome", "specimen"] },
];

export function demoArtStyles(): LaneEntity[] {
  if (!demoCatalogEnabled()) return [];
  return DEMO_ART_STYLES.map((s) => {
    const id = `specimen-art-${s.slug}`;
    return {
      entity_id: id,
      status: "Published",
      fields: {
        Id: id,
        Status: "Published",
        name: s.name,
        slug: s.slug,
        medium: s.medium,
        prompt_template: s.prompt,
        tags: JSON.stringify(s.tags),
      },
    };
  });
}

export function getDemoArtStyle(id: string): LaneEntity | undefined {
  return demoArtStyles().find((s) => s.entity_id === id);
}
