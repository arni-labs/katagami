// Static manifest for the unlisted /lab model bake-off.
// Artifacts are served from public/lab/<slug>/<model.dir>/{landing,dashboard,immersive}.html
// One round shown (round 11 = "with rules"); round 12 ("no rules") rides along as a
// per-model `variant` toggled in the UI (same 12 models, two generation conditions).
// Prior rounds live in git history + experiments/model-bakeoff/bakeoff-results.json.

export type LabView = "embodiment" | "landing" | "dashboard" | "immersive";

export interface LabModel {
  name: string; // revealed name
  dir: string; // folder under public/lab/<slug>/
  views?: LabView[]; // per-model available views; defaults to the comparison's views
  tokens?: string; // thinking tokens, display string (e.g. "213K") — shown on reveal
  cost?: string; // billed cost, display string (e.g. "$13.64") — shown on reveal
  wall?: string; // wall-clock run time, display string (e.g. "24m 20s") — shown on reveal
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
    slug: "kodomo-no-hi-11",
    tag: "R11",
    title: "Kodomo no Hi",
    eyebrow: "",
    blurb: "",
    prompt:
      "CONCEPT\nA Kodomo no Hi (Japanese Children's Day) product, grounded in real, specific design precedent (fabricated references disqualify).\n\nAESTHETIC DIRECTION (bold, creative graphic design)\nBright, airy, hopeful early-summer Kodomo no Hi — clear light, fresh greenery, koinobori rising — pushed into confident GRAPHIC DESIGN. Lots of open white, then vivid, almost-neon accent colour used like highlighters (electric sky-blues, fresh greens, a hot pop), bright and clean, never muddy or washed-out pastel. Be creative and expressive — posters, editorial composition, strong type. Stay SLEEK, CLEAN, GROWN-UP — a product an adult would launch; not childish, not cluttered, not a toy. Commit to ONE strong aesthetic.",
    views: ["landing", "dashboard", "immersive"],
    blindOrder: [
      "kimi",
      "opus",
      "grok-build",
      "minimax",
      "gpt",
      "fugu",
      "glm",
      "qwen37",
      "composer",
      "fugu-ultra",
      "deepseek",
      "qwen36-or",
    ],
    models: {
      "opus": { name: "Opus 4.8", dir: "opus-4.8", harness: "claude-code", imageModel: "Grok Imagine", tokens: "213K", cost: "$13.64", wall: "54m 28s" },
      "gpt": { name: "GPT-5.5", dir: "gpt-5", harness: "codex", imageModel: "gpt-image", tokens: "342K", cost: "$2.68", wall: "44m 53s" },
      "grok-build": { name: "Grok Build", dir: "grok-4.3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "96K", cost: "$0.10", wall: "6m 37s" },
      "composer": { name: "Composer 2.5", dir: "composer", harness: "grok-build", imageModel: "Grok Imagine", tokens: "70K", cost: "$0.21", wall: "3m 27s" },
      "glm": { name: "GLM 5.2", dir: "glm-5.2", harness: "grok-build", imageModel: "Grok Imagine", tokens: "619K", cost: "$1.40", wall: "25m 36s" },
      "qwen36-or": { name: "Qwen 3.6 35B", dir: "qwen3.6-35b", harness: "grok-build", tokens: "59K", cost: "$0.03", wall: "2m 53s", views: [], note: "Failed under the rules — produced no surfaces. See the No-rules variant." },
      "qwen37": { name: "Qwen 3.7 Max", dir: "qwen3.7-max", harness: "grok-build", imageModel: "Grok Imagine", tokens: "378K", cost: "$1.12", wall: "14m 49s" },
      "deepseek": { name: "DeepSeek V4", dir: "deepseek-v4", harness: "grok-build", imageModel: "Grok Imagine", tokens: "219K", cost: "$0.12", wall: "11m 21s" },
      "minimax": { name: "MiniMax M3", dir: "minimax-m3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "949K", cost: "$1.32", wall: "68m 39s" },
      "kimi": { name: "Kimi K2.7", dir: "kimi-k2.7", harness: "grok-build", imageModel: "Grok Imagine", tokens: "3.15M", cost: "$3.69", wall: "40m 31s" },
      "fugu": { name: "Fugu", dir: "fugu", harness: "grok-build", imageModel: "Grok Imagine", tokens: "415K", cost: "$2.79", wall: "13m 08s" },
      "fugu-ultra": { name: "Fugu Ultra", dir: "fugu-ultra", harness: "grok-build", imageModel: "Grok Imagine", tokens: "1.44M", cost: "$24.29", wall: "55m 10s" },
    },
    variant: {
      label: "no rules",
      primaryLabel: "anti-slop rules",
      slug: "kodomo-no-hi-12",
      views: ["landing", "dashboard"],
      models: {
        "opus": { name: "Opus 4.8", dir: "opus-4.8", harness: "claude-code", imageModel: "Grok Imagine", tokens: "99K", cost: "$2.87", wall: "24m 20s" },
        "gpt": { name: "GPT-5.5", dir: "gpt-5", harness: "codex", imageModel: "gpt-image", tokens: "108K", cost: "$0.49", wall: "11m 20s" },
        "grok-build": { name: "Grok Build", dir: "grok-4.3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "87K", cost: "$0.09", wall: "6m 27s" },
        "composer": { name: "Composer 2.5", dir: "composer", harness: "grok-build", imageModel: "Grok Imagine", tokens: "52K", cost: "$0.16", wall: "3m 10s" },
        "glm": { name: "GLM 5.2", dir: "glm-5.2", harness: "grok-build", imageModel: "Grok Imagine", tokens: "375K", cost: "$0.97", wall: "10m 21s" },
        "qwen36-or": { name: "Qwen 3.6 35B", dir: "qwen3.6-35b", harness: "grok-build", imageModel: "Grok Imagine", tokens: "142K", cost: "$0.14", wall: "6m 38s" },
        "qwen37": { name: "Qwen 3.7 Max", dir: "qwen3.7-max", harness: "grok-build", imageModel: "Grok Imagine", tokens: "253K", cost: "$0.84", wall: "12m 07s" },
        "deepseek": { name: "DeepSeek V4", dir: "deepseek-v4", harness: "grok-build", imageModel: "Grok Imagine", tokens: "161K", cost: "$0.09", wall: "10m 20s" },
        "minimax": { name: "MiniMax M3", dir: "minimax-m3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "521K", cost: "$1.11", wall: "31m 43s" },
        "kimi": { name: "Kimi K2.7", dir: "kimi-k2.7", harness: "grok-build", imageModel: "Grok Imagine", tokens: "1.39M", cost: "$1.60", wall: "12m 13s" },
        "fugu": { name: "Fugu", dir: "fugu", harness: "grok-build", imageModel: "Grok Imagine", tokens: "249K", cost: "$1.92", wall: "7m 45s" },
        "fugu-ultra": { name: "Fugu Ultra", dir: "fugu-ultra", harness: "grok-build", imageModel: "Grok Imagine", tokens: "904K", cost: "$12.33", wall: "25m 36s" },
      },
    },
    judged: false,
  },
];

export function getComparison(slug: string): LabComparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
