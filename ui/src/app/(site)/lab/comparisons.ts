// Static manifest for the unlisted /lab model bake-off (published at /model-bake-off).
// Artifact HTML/media is intentionally not kept in this repo. Configure
// NEXT_PUBLIC_MODEL_BAKEOFF_ASSET_BASE_URL to point at the external artifact
// source whose layout is <base>/<slug>/<model.dir>/{landing,dashboard,immersive}.html.
// blindOrder is sorted by cost descending. Historical rounds live in the
// external local bakeoff review corpus, not GitHub.

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
  blindOrder: string[]; // model keys in display order -> A, B, C, … (cost descending)
  models: Record<string, LabModel>;
  variant?: LabVariant;
  judged: boolean;
}

export const COMPARISONS: LabComparison[] = [
  {
    slug: "kodomo-no-hi-17",
    tag: "R17",
    title: "Kodomo no Hi",
    eyebrow: "",
    blurb: "",
    prompt:
      "CONCEPT\nA Kodomo no Hi (Japanese Children's Day) product, grounded in real, specific design precedent (fabricated references disqualify).\n\nAESTHETIC DIRECTION (bold, creative graphic design)\nBright, airy, hopeful early-summer Kodomo no Hi — clear light, fresh greenery, koinobori rising — pushed into confident GRAPHIC DESIGN. Lots of open white, then vivid, almost-neon accent colour used like highlighters (electric sky-blues, fresh greens, a hot pop), bright and clean, never muddy or washed-out pastel. Be creative and expressive — posters, editorial composition, strong type. Stay SLEEK, CLEAN, GROWN-UP — a product an adult would launch; not childish, not cluttered, not a toy. Commit to ONE strong aesthetic.",
    views: ["landing", "dashboard"],
    blindOrder: [
      "fugu-ultra",
      "opus",
      "fugu",
      "composer",
      "qwen37",
      "gpt",
      "kimi",
      "glm",
      "grok-build",
      "minimax",
      "qwen36-or",
      "deepseek",
    ],
    models: {
      "fugu-ultra": { name: "Fugu Ultra", dir: "fugu-ultra", harness: "grok-build", imageModel: "Grok Imagine", tokens: "240K", cost: "$5.49", wall: "28m 50s" },
      "opus": { name: "Opus 4.8", dir: "opus-4.8", harness: "claude-code", imageModel: "Grok Imagine", tokens: "93K", cost: "$4.05", wall: "16m 52s" },
      "fugu": { name: "Fugu", dir: "fugu", harness: "grok-build", imageModel: "Grok Imagine", tokens: "210K", cost: "$1.05", wall: "9m 15s" },
      "composer": { name: "Composer 2.5", dir: "composer", harness: "grok-build", imageModel: "Grok Imagine", tokens: "98K", cost: "$0.68", wall: "3m 51s" },
      "qwen37": { name: "Qwen 3.7", dir: "qwen3.7-max", harness: "grok-build", imageModel: "Grok Imagine", tokens: "301K", cost: "$0.67", wall: "12m 57s" },
      "gpt": { name: "GPT-5.5", dir: "gpt-5", harness: "codex", imageModel: "gpt-image", tokens: "124K", cost: "$0.60", wall: "11m 07s" },
      "kimi": { name: "Kimi K2.7", dir: "kimi-k2.7", harness: "grok-build", imageModel: "Grok Imagine", tokens: "374K", cost: "$0.56", wall: "12m 05s" },
      "glm": { name: "GLM 5.2", dir: "glm-5.2", harness: "grok-build", imageModel: "Grok Imagine", tokens: "253K", cost: "$0.54", wall: "16m 00s" },
      "grok-build": { name: "Grok Build", dir: "grok-4.3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "82K", cost: "$0.49", wall: "5m 21s" },
      "minimax": { name: "MiniMax M3", dir: "minimax-m3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "373K", cost: "$0.28", wall: "24m 44s" },
      "qwen36-or": { name: "Qwen 3.6", dir: "qwen3.6-35b", harness: "grok-build", imageModel: "Grok Imagine", tokens: "343K", cost: "$0.27", wall: "10m 11s" },
      "deepseek": { name: "DeepSeek V4 Pro", dir: "deepseek-v4", harness: "grok-build", imageModel: "Grok Imagine", tokens: "565K", cost: "$0.26", wall: "12m 14s" },
    },
    judged: false,
  },
];

export function getComparison(slug: string): LabComparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
