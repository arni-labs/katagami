// Static manifest for the unlisted /lab model bake-off (published at /model-bake-off).
// Artifacts are served from public/lab/<slug>/<model.dir>/{landing,dashboard,immersive}.html
// One round shown (round 13 = "anti-slop rules"); round 14 ("no rules") rides along as a
// per-model `variant` toggled in the UI (same 12 models, two generation conditions).
// blindOrder is sorted by cost descending. Prior rounds live in git + bakeoff-results.json.

import { ARCHIVE_ROUNDS } from "./rounds-archive";

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
  rules?: string; // the anti-slop rulebook seeded into the rules round (shown in a collapsible)
  views: LabView[];
  blindOrder: string[]; // model keys in display order -> A, B, C, … (cost descending)
  models: Record<string, LabModel>;
  variant?: LabVariant;
  judged: boolean;
}

export const COMPARISONS: LabComparison[] = [
  {
    slug: "kodomo-no-hi-15",
    tag: "R15",
    title: "Kodomo no Hi",
    eyebrow: "",
    blurb: "",
    prompt:
      "CONCEPT\nCreate ONE Katagami design language for Kodomo no Hi (Japanese Children's Day / Koinobori, the carp-streamer festival), grounded in real, specific design precedent — then build three surfaces that all use it: a marketing landing, an immersive 3D landing, and a product dashboard. One language, one name, consistent across everything.\n\nAESTHETIC BRIEF — the look to hit\nBright, airy, hopeful early-summer Kodomo no Hi — clear light, fresh greenery, koinobori rising — pushed into confident GRAPHIC DESIGN. Lots of open white, then vivid, almost-neon accent colour used like highlighters (electric sky-blues, fresh greens, a hot pop), bright and clean, never muddy or washed-out pastel. Be creative and expressive — posters, editorial composition, strong type. Stay SLEEK, CLEAN, GROWN-UP — a product an adult would launch; not childish, not cluttered, not a toy. Commit to ONE strong aesthetic.\n\nTHE LANGUAGE (DESIGN.md)\nA complete, coherent system: POV, tokens (colour, type, spacing, radius), one shared control-height token, the full state matrix (default / hover / focus-with-a-visible-ring / active / disabled), surfaces separated by tone not borders, every form control explicitly styled.\n\nSURFACE 1 — LANDING\nA believable, expressive product landing with one full-bleed hero — a real product world, never a spec sheet.\n\nSURFACE 2 — IMMERSIVE\nOne continuous, real-time low-poly 3D world the visitor flies through on scroll — a polished game scene (ground, sky, a river rising to the waterfall the carp climbs to become a dragon), not a tech demo. Koinobori rippling via a custom GLSL cloth shader, a scroll-driven cinematic camera, Three.js + GSAP, no blended stills.\n\nSURFACE 3 — DASHBOARD\nA real, believable product dashboard in the language.\n\nMEDIA\nGenerate hero and feature imagery with an image model in a style that fits the language (landing + dashboard only; the immersive page stays pure 3D).",
    rules:
      "HOW THESE RULES WORK\nEach rule states a taste goal and leaves the how to the language. An anti-pattern names the slop to avoid — never a whole vocabulary to remove. If a rule would make every language converge on the same look, it is too prescriptive. Variety between languages is the point.\n\nCONCEPT\n1. Give each language one ownable idea, expressed as a signature mechanic.\n2. Never ship a generic language (warm Swiss, clean minimal).\n3. Ship the language with its paired palette and art style as one coherent set.\n4. Write copy in a real product scene — concrete verbs, product nouns, invented brand names; never AI clichés, lorem, or placeholders.\n\nNAMING\n5. Prefer one distinctive evocative noun; match the name's culture to the concept; vary the source widely.\n6. Use a subject noun + maker noun (Press, Works, Bureau) only when one word can't carry the idea.\n7. Draw the subject from the language's strongest motif — never a mood word; rotate subjects and cultures.\n8. Cap every grounding noun — only a handful of '___ Press' across the whole library.\n9. Never lead with an adjective, stack genres/eras, coin portmanteaus, or append IDs/dates.\n\nLOOK\n10. Never give a card a single accent/highlight edge.\n11. Use at most 3 accent colours, like highlighters.\n12. Tune neutrals to the palette's temperature.\n13. Clean, never muddy.\n14. One coherent geometry; no arbitrary in-between radii.\n15. Body text 17px+; high contrast.\n16. Make one button clearly primary; a button set shares one shape and height.\n17. Everything fits its container — nothing overflows, clips, or crowds.\n18. Ornament must mean something and belong to one considered system.\n19. Don't over-box the chrome: never nest cards; never trap the nav in a floating pill bar.\n20. Explicitly style every form control — no visible browser defaults.\n21. Give generous spacing; always pad above titles.\n22. Light, dark, or colour — the concept chooses the mode and the ground.\n23. No emoji on buttons, and no symbol glyphs in copy.\n\nRESPONSIVE\n24. Render well from ~390px mobile to 2560px+ ultra-wide.\n25. On mobile, stack to a single column; never overflow horizontally.\n26. On ultra-wide, cap and centre the content; only the hero spans full width.\n27. Use minmax(0,1fr) columns so grids never blow out.\n\nLANDING\n28. Open on a full-viewport hero, edge to edge; composition is the language's choice.\n29. The hero uses a swappable background image, never an inline img.\n30. Keep the hero overlay legible; no lazy gradient scrim.\n31. No scroll cues or down-arrow indicators.\n32. Below the hero, return to rich, full sections.\n33. Never stack a tiny uppercase eyebrow directly above an oversized hero headline.\n34. Make the hero headline this language's own, not the generic AI-startup serif.\n\nMOTION\n35. Animate with intent, like a shipped product page; motion carries meaning, never decoration.\n36. The settled state is the default — visible with no JavaScript; motion is added on top; respect reduced-motion.",
    views: ["landing", "dashboard", "immersive"],
    blindOrder: [
      "opus",
      "fugu-ultra",
      "fugu",
      "kimi",
      "composer",
      "glm",
      "qwen37",
      "gpt",
      "grok-build",
      "minimax",
      "qwen36-or",
      "deepseek",
    ],
    models: {
      "opus": { name: "Opus 4.8", dir: "opus-4.8", harness: "claude-code", imageModel: "Grok Imagine", tokens: "167K", cost: "$8.92", wall: "31m 57s" },
      "gpt": { name: "GPT-5.5", dir: "gpt-5", harness: "codex", imageModel: "gpt-image", tokens: "129K", cost: "$0.66", wall: "14m 21s" },
      "grok-build": { name: "Grok Build", dir: "grok-4.3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "170K", cost: "$0.41", wall: "5m 27s" },
      "composer": { name: "Composer 2.5", dir: "composer", harness: "grok-build", imageModel: "Grok Imagine", tokens: "95K", cost: "$0.85", wall: "3m 41s" },
      "glm": { name: "GLM 5.2", dir: "glm-5.2", harness: "grok-build", imageModel: "Grok Imagine", tokens: "339K", cost: "$0.81", wall: "20m 55s" },
      "qwen36-or": { name: "Qwen 3.6", dir: "qwen3.6-35b", harness: "grok-build", imageModel: "Grok Imagine", tokens: "221K", cost: "$0.24", wall: "17m 08s" },
      "qwen37": { name: "Qwen 3.7", dir: "qwen3.7-max", harness: "grok-build", imageModel: "Grok Imagine", tokens: "238K", cost: "$0.73", wall: "13m 41s" },
      "deepseek": { name: "DeepSeek V4 Pro", dir: "deepseek-v4", harness: "grok-build", imageModel: "Grok Imagine", tokens: "187K", cost: "$0.10", wall: "17m 04s" },
      "minimax": { name: "MiniMax M3", dir: "minimax-m3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "376K", cost: "$0.34", wall: "17m 53s" },
      "kimi": { name: "Kimi K2.7", dir: "kimi-k2.7", harness: "grok-build", imageModel: "Grok Imagine", tokens: "664K", cost: "$1.07", wall: "19m 20s" },
      "fugu": { name: "Fugu", dir: "fugu", harness: "grok-build", imageModel: "Grok Imagine", tokens: "404K", cost: "$1.96", wall: "13m 00s" },
      "fugu-ultra": { name: "Fugu Ultra", dir: "fugu-ultra", harness: "grok-build", imageModel: "Grok Imagine", tokens: "426K", cost: "$8.45", wall: "34m 45s" },
    },
    variant: {
      label: "no rules",
      primaryLabel: "anti-slop rules",
      slug: "kodomo-no-hi-16",
      views: ["landing", "dashboard"],
      models: {
        "opus": { name: "Opus 4.8", dir: "opus-4.8", harness: "claude-code", imageModel: "Grok Imagine", tokens: "95K", cost: "$3.89", wall: "16m 10s" },
        "gpt": { name: "GPT-5.5", dir: "gpt-5", harness: "codex", imageModel: "gpt-image", tokens: "95K", cost: "$0.44", wall: "9m 41s" },
        "grok-build": { name: "Grok Build", dir: "grok-4.3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "74K", cost: "$0.29", wall: "3m 54s" },
        "composer": { name: "Composer 2.5", dir: "composer", harness: "grok-build", imageModel: "Grok Imagine", tokens: "63K", cost: "$0.52", wall: "2m 15s" },
        "glm": { name: "GLM 5.2", dir: "glm-5.2", harness: "grok-build", imageModel: "Grok Imagine", tokens: "453K", cost: "$0.65", wall: "26m 59s" },
        "qwen36-or": { name: "Qwen 3.6", dir: "qwen3.6-35b", harness: "grok-build", imageModel: "Grok Imagine", tokens: "147K", cost: "$0.15", wall: "5m 25s" },
        "qwen37": { name: "Qwen 3.7", dir: "qwen3.7-max", harness: "grok-build", imageModel: "Grok Imagine", tokens: "212K", cost: "$0.63", wall: "11m 58s" },
        "deepseek": { name: "DeepSeek V4 Pro", dir: "deepseek-v4", harness: "grok-build", imageModel: "Grok Imagine", tokens: "223K", cost: "$0.11", wall: "6m 59s" },
        "minimax": { name: "MiniMax M3", dir: "minimax-m3", harness: "grok-build", imageModel: "Grok Imagine", tokens: "266K", cost: "$0.16", wall: "14m 19s" },
        "kimi": { name: "Kimi K2.7", dir: "kimi-k2.7", harness: "grok-build", imageModel: "Grok Imagine", tokens: "329K", cost: "$0.46", wall: "8m 30s" },
        "fugu": { name: "Fugu", dir: "fugu", harness: "grok-build", imageModel: "Grok Imagine", tokens: "89K", cost: "$0.84", wall: "8m 14s" },
        "fugu-ultra": { name: "Fugu Ultra", dir: "fugu-ultra", harness: "grok-build", imageModel: "Grok Imagine", tokens: "311K", cost: "$4.76", wall: "15m 29s" },
      },
    },
    judged: false,
  },
  // archive of every prior round — local/dev only; production shows just the headline round
  ...(process.env.NODE_ENV === "development" ? ARCHIVE_ROUNDS : []),
];

export function getComparison(slug: string): LabComparison | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
