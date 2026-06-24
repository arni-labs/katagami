// Static manifest for the unlisted /lab model bake-off (published at /model-bake-off).
// Artifacts are served from public/lab/<slug>/<model.dir>/{landing,dashboard,immersive}.html
// One round shown (round 13 = "anti-slop rules"); round 14 ("no rules") rides along as a
// per-model `variant` toggled in the UI (same 12 models, two generation conditions).
// Prior rounds live in git history + experiments/model-bakeoff/bakeoff-results.json.

export type LabView = "embodiment" | "landing" | "dashboard" | "immersive";

export interface LabModel {
  name: string; // revealed name
  dir: string; // folder under public/lab/<slug>/
  views?: LabView[]; // per-model available views; defaults to the comparison's views
  tokens?: string; // thinking tokens, display string (e.g. "132K") — shown on reveal
  cost?: string; // billed cost, display string (e.g. "$5.04") — shown on reveal
  wall?: string; // wall-clock run time, display string (e.g. "25m 09s") — shown on reveal
  harness?: string; // the CLI/agent it ran in (claude-code, codex, grok-build) — shown on reveal
  imageModel?: string; // image model used (Grok Imagine, gpt-image, …) — shown on reveal
  note?: string; // small footnote shown on reveal
}

// An alternate generation of the SAME models (e.g. "no rules") — toggled in the UI.
export interface LabVariant {
  label: string; // toggle label for this set, e.g. "No rules"
  primaryLabel: string; // toggle label for the primary set, e.g. "With rules"
  slug: string; // artifact dir slug for this set
  views: LabView[];
  models: Record<string, LabModel>;
}

export interface LabComparison {
  slug: string;
  tag: string; // short label, kept for the snapshot record
  title: string;
  eyebrow: string;
  blurb: string;
  prompt?: string; // the brief handed to every model this round ("what was the prompt")
  views: LabView[];
  blindOrder: string[]; // model keys in display order -> A, B, C, …
  models: Record<string, LabModel>;
  variant?: LabVariant;
  judged: boolean;
}

export const COMPARISONS: LabComparison[] = [
  {
    slug: "kodomo-no-hi-13",
    tag: "R13",
    title: "Kodomo no Hi",
    eyebrow: "",
    blurb: "",
    prompt:
      "CONCEPT\nA Kodomo no Hi (Japanese Children's Day) product, grounded in real, specific design precedent (fabricated references disqualify).\n\nAESTHETIC DIRECTION (bold, creative graphic design)\nBright, airy, hopeful early-summer Kodomo no Hi — clear light, fresh greenery, koinobori rising — pushed into confident GRAPHIC DESIGN. Lots of open white, then vivid, almost-neon accent colour used like highlighters (electric sky-blues, fresh greens, a hot pop), bright and clean, never muddy or washed-out pastel. Be creative and expressive — posters, editorial composition, strong type. Stay SLEEK, CLEAN, GROWN-UP — a product an adult would launch; not childish, not cluttered, not a toy. Commit to ONE strong aesthetic.",
    views: ["landing", "dashboard", "immersive"],
    blindOrder: [
      "minimax",
      "opus",
      "kimi",
      "gpt",
      "fugu-ultra",
      "glm",
      "grok-build",
      "qwen37",
      "deepseek",
      "composer",
      "fugu",
      "qwen36-or",
    ],
    models: {
      "opus": { name: "Opus 4.8", dir: "opus-4.8", harness: "claude-code", imageModel: "Grok Imagine", tokens: "132K", cost: "$5.04", wall: "25m 09s" },
      "gpt": { name: "GPT-5.5", dir: "gpt-5", harness: "codex", imageModel: "gpt-image", tokens: "132K", cost: "$0.65", wall: "13m 41s" },
      "grok-build": { name: "Grok Build", dir: "grok-4.3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "68K", cost: "$0.42", wall: "5m 45s" },
      "composer": { name: "Composer 2.5", dir: "composer", harness: "grok-build", imageModel: "Grok Imagine", tokens: "80K", cost: "$0.70", wall: "2m 52s" },
      "glm": { name: "GLM 5.2", dir: "glm-5.2", harness: "grok-build", imageModel: "Grok Imagine", tokens: "837K", cost: "$1.91", wall: "33m 54s" },
      "qwen36-or": { name: "Qwen 3.6 35B", dir: "qwen3.6-35b", harness: "grok-build", imageModel: "Grok Imagine", tokens: "170K", cost: "$0.23", wall: "5m 00s" },
      "qwen37": { name: "Qwen 3.7 Max", dir: "qwen3.7-max", harness: "grok-build", imageModel: "Grok Imagine", tokens: "172K", cost: "$0.83", wall: "14m 56s" },
      "deepseek": { name: "DeepSeek V4", dir: "deepseek-v4", harness: "grok-build", imageModel: "Grok Imagine", tokens: "160K", cost: "$0.09", wall: "9m 32s" },
      "minimax": { name: "MiniMax M3", dir: "minimax-m3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "289K", cost: "$0.25", wall: "22m 31s" },
      "kimi": { name: "Kimi K2.7", dir: "kimi-k2.7", harness: "grok-build", imageModel: "Grok Imagine", tokens: "600K", cost: "$1.20", wall: "15m 24s" },
      "fugu": { name: "Fugu", dir: "fugu", harness: "grok-build", imageModel: "Grok Imagine", tokens: "134K", cost: "$1.39", wall: "11m 36s" },
      "fugu-ultra": { name: "Fugu Ultra", dir: "fugu-ultra", harness: "grok-build", imageModel: "Grok Imagine", tokens: "589K", cost: "$9.88", wall: "39m 48s" },
    },
    variant: {
      label: "no rules",
      primaryLabel: "anti-slop rules",
      slug: "kodomo-no-hi-14",
      views: ["landing", "dashboard"],
      models: {
        "gpt": { name: "GPT-5.5", dir: "gpt-5", harness: "codex", imageModel: "gpt-image", tokens: "131K", cost: "$0.53", wall: "11m 21s" },
        "grok-build": { name: "Grok Build", dir: "grok-4.3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "72K", cost: "$0.46", wall: "4m 34s" },
        "composer": { name: "Composer 2.5", dir: "composer", harness: "grok-build", imageModel: "Grok Imagine", tokens: "88K", cost: "$0.65", wall: "2m 23s" },
        "glm": { name: "GLM 5.2", dir: "glm-5.2", harness: "grok-build", imageModel: "Grok Imagine", tokens: "508K", cost: "$0.82", wall: "14m 38s" },
        "qwen36-or": { name: "Qwen 3.6 35B", dir: "qwen3.6-35b", harness: "grok-build", imageModel: "Grok Imagine", tokens: "122K", cost: "$0.10", wall: "8m 27s" },
        "qwen37": { name: "Qwen 3.7 Max", dir: "qwen3.7-max", harness: "grok-build", imageModel: "Grok Imagine", tokens: "347K", cost: "$0.79", wall: "10m 57s" },
        "deepseek": { name: "DeepSeek V4", dir: "deepseek-v4", harness: "grok-build", imageModel: "Grok Imagine", tokens: "111K", cost: "$0.07", wall: "10m 12s" },
        "minimax": { name: "MiniMax M3", dir: "minimax-m3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "215K", cost: "$0.18", wall: "6m 16s" },
        "kimi": { name: "Kimi K2.7", dir: "kimi-k2.7", harness: "grok-build", imageModel: "Grok Imagine", tokens: "95K", cost: "$0.32", wall: "11m 13s" },
        "fugu": { name: "Fugu", dir: "fugu", harness: "grok-build", imageModel: "Grok Imagine", tokens: "230K", cost: "$1.21", wall: "8m 53s" },
        "fugu-ultra": { name: "Fugu Ultra", dir: "fugu-ultra", harness: "grok-build", imageModel: "Grok Imagine", tokens: "185K", cost: "$3.03", wall: "13m 29s" },
      },
    },
    judged: false,
  },
];

export function getComparison(slug: string): LabComparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
