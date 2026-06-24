// AUTO-GENERATED archive of historical bake-off rounds (1-12).
// Built from experiments/model-bakeoff/bakeoff-results.json + on-disk artifacts.
import type { LabComparison } from "./comparisons";

export const ARCHIVE_ROUNDS: LabComparison[] = [
{
  "slug": "kodomo-no-hi-14",
  "tag": "R13·no rules",
  "title": "Kodomo no Hi — no rules",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "fugu-ultra",
    "opus",
    "glm",
    "fugu",
    "kimi",
    "qwen37",
    "composer",
    "gpt",
    "grok-build",
    "minimax",
    "qwen36-or",
    "deepseek"
  ],
  "models": {
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "185K",
      "cost": "$3.03",
      "wall": "13m 29s"
    },
    "opus": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "claude-code",
      "imageModel": "Grok Imagine",
      "tokens": "115K",
      "cost": "$4.52",
      "wall": "19m 39s"
    },
    "glm": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "585K",
      "cost": "$0.91",
      "wall": "14m 38s"
    },
    "fugu": {
      "name": "Fugu",
      "dir": "fugu",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "230K",
      "cost": "$1.21",
      "wall": "8m 53s"
    },
    "kimi": {
      "name": "Kimi K2.7",
      "dir": "kimi-k2.7",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "95K",
      "cost": "$0.32",
      "wall": "11m 13s"
    },
    "qwen37": {
      "name": "Qwen 3.7 Max",
      "dir": "qwen3.7-max",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "347K",
      "cost": "$0.79",
      "wall": "10m 57s"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "88K",
      "cost": "$0.65",
      "wall": "2m 23s"
    },
    "gpt": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "codex",
      "imageModel": "gpt-image",
      "tokens": "131K",
      "cost": "$0.53",
      "wall": "11m 21s"
    },
    "grok-build": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "72K",
      "cost": "$0.46",
      "wall": "4m 34s"
    },
    "minimax": {
      "name": "MiniMax M3",
      "dir": "minimax-m3",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "215K",
      "cost": "$0.18",
      "wall": "6m 16s"
    },
    "qwen36-or": {
      "name": "Qwen 3.6 35B",
      "dir": "qwen3.6-35b",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "122K",
      "cost": "$0.10",
      "wall": "8m 27s"
    },
    "deepseek": {
      "name": "DeepSeek V4",
      "dir": "deepseek-v4",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "111K",
      "cost": "$0.07",
      "wall": "10m 12s"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-13",
  "tag": "R13",
  "title": "Kodomo no Hi",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "landing",
    "dashboard",
    "immersive"
  ],
  "blindOrder": [
    "fugu-ultra",
    "opus",
    "glm",
    "fugu",
    "kimi",
    "qwen37",
    "composer",
    "gpt",
    "grok-build",
    "minimax",
    "qwen36-or",
    "deepseek"
  ],
  "models": {
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "589K",
      "cost": "$9.88",
      "wall": "39m 48s"
    },
    "opus": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "claude-code",
      "imageModel": "Grok Imagine",
      "tokens": "132K",
      "cost": "$5.04",
      "wall": "25m 09s"
    },
    "glm": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "837K",
      "cost": "$1.91",
      "wall": "33m 54s"
    },
    "fugu": {
      "name": "Fugu",
      "dir": "fugu",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "134K",
      "cost": "$1.39",
      "wall": "11m 36s"
    },
    "kimi": {
      "name": "Kimi K2.7",
      "dir": "kimi-k2.7",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "600K",
      "cost": "$1.20",
      "wall": "15m 24s"
    },
    "qwen37": {
      "name": "Qwen 3.7 Max",
      "dir": "qwen3.7-max",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "172K",
      "cost": "$0.83",
      "wall": "14m 56s"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "80K",
      "cost": "$0.70",
      "wall": "2m 52s"
    },
    "gpt": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "codex",
      "imageModel": "gpt-image",
      "tokens": "132K",
      "cost": "$0.65",
      "wall": "13m 41s"
    },
    "grok-build": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "68K",
      "cost": "$0.42",
      "wall": "5m 45s"
    },
    "minimax": {
      "name": "MiniMax M3",
      "dir": "minimax-m3",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "289K",
      "cost": "$0.25",
      "wall": "22m 31s"
    },
    "qwen36-or": {
      "name": "Qwen 3.6 35B",
      "dir": "qwen3.6-35b",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "170K",
      "cost": "$0.23",
      "wall": "5m 00s"
    },
    "deepseek": {
      "name": "DeepSeek V4",
      "dir": "deepseek-v4",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "160K",
      "cost": "$0.09",
      "wall": "9m 32s"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-12",
  "tag": "R11·No rules",
  "title": "Kodomo no Hi — No rules",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "landing",
    "dashboard"
  ],
  "blindOrder": [
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
    "qwen36-or"
  ],
  "models": {
    "kimi": {
      "name": "Kimi K2.7",
      "dir": "kimi-k2.7",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.39M",
      "cost": "$1.60",
      "wall": "12m 13s"
    },
    "opus": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "claude-code",
      "imageModel": "Grok Imagine",
      "tokens": "99K",
      "cost": "$2.87",
      "wall": "24m 20s"
    },
    "grok-build": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "87K",
      "cost": "$0.09",
      "wall": "6m 27s"
    },
    "minimax": {
      "name": "MiniMax M3",
      "dir": "minimax-m3",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "521K",
      "cost": "$1.11",
      "wall": "31m 43s"
    },
    "gpt": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "codex",
      "imageModel": "gpt-image",
      "tokens": "108K",
      "cost": "$0.49",
      "wall": "11m 20s"
    },
    "fugu": {
      "name": "Fugu",
      "dir": "fugu",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "249K",
      "cost": "$1.92",
      "wall": "7m 45s"
    },
    "glm": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "375K",
      "cost": "$0.97",
      "wall": "10m 21s"
    },
    "qwen37": {
      "name": "Qwen 3.7 Max",
      "dir": "qwen3.7-max",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "253K",
      "cost": "$0.84",
      "wall": "12m 07s"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "52K",
      "cost": "$0.16",
      "wall": "3m 10s"
    },
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "904K",
      "cost": "$12.33",
      "wall": "25m 36s"
    },
    "deepseek": {
      "name": "DeepSeek V4",
      "dir": "deepseek-v4",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "161K",
      "cost": "$0.09",
      "wall": "10m 20s"
    },
    "qwen36-or": {
      "name": "Qwen 3.6 35B",
      "dir": "qwen3.6-35b",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "142K",
      "cost": "$0.14",
      "wall": "6m 38s"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-11",
  "tag": "R11",
  "title": "Kodomo no Hi",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "landing",
    "dashboard",
    "immersive"
  ],
  "blindOrder": [
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
    "deepseek"
  ],
  "models": {
    "kimi": {
      "name": "Kimi K2.7",
      "dir": "kimi-k2.7",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "3.15M",
      "cost": "$3.69",
      "wall": "40m 31s"
    },
    "opus": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "claude-code",
      "imageModel": "Grok Imagine",
      "tokens": "213K",
      "cost": "$13.64",
      "wall": "54m 28s"
    },
    "grok-build": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "96K",
      "cost": "$0.10",
      "wall": "6m 37s"
    },
    "minimax": {
      "name": "MiniMax M3",
      "dir": "minimax-m3",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "949K",
      "cost": "$1.32",
      "wall": "68m 39s"
    },
    "gpt": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "codex",
      "imageModel": "gpt-image",
      "tokens": "342K",
      "cost": "$2.68",
      "wall": "44m 53s"
    },
    "fugu": {
      "name": "Fugu",
      "dir": "fugu",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "415K",
      "cost": "$2.79",
      "wall": "13m 08s"
    },
    "glm": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "619K",
      "cost": "$1.40",
      "wall": "25m 36s"
    },
    "qwen37": {
      "name": "Qwen 3.7 Max",
      "dir": "qwen3.7-max",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "378K",
      "cost": "$1.12",
      "wall": "14m 49s"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "70K",
      "cost": "$0.21",
      "wall": "3m 27s"
    },
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.44M",
      "cost": "$24.29",
      "wall": "55m 10s"
    },
    "deepseek": {
      "name": "DeepSeek V4",
      "dir": "deepseek-v4",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "219K",
      "cost": "$0.12",
      "wall": "11m 21s"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-10",
  "tag": "R10",
  "title": "Kodomo no Hi",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "deepseek-v4",
    "opus-4.8",
    "fugu",
    "qwen3.7-max",
    "grok-4.3",
    "minimax-m3",
    "composer",
    "kimi-k2.7",
    "fugu-ultra",
    "glm-5.2",
    "qwen3.6-35b",
    "gpt-5"
  ],
  "models": {
    "deepseek-v4": {
      "name": "DeepSeek V4",
      "dir": "deepseek-v4",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.11M",
      "cost": "$0.50",
      "wall": "9m 18s"
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "claude-code",
      "imageModel": "Grok Imagine"
    },
    "fugu": {
      "name": "Fugu",
      "dir": "fugu",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.39M",
      "cost": "$3.89",
      "wall": "9m 47s"
    },
    "qwen3.7-max": {
      "name": "Qwen 3.7 Max",
      "dir": "qwen3.7-max",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.01M",
      "cost": "$1.37",
      "wall": "16m 0s"
    },
    "grok-4.3": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "wall": "6m 48s"
    },
    "minimax-m3": {
      "name": "MiniMax M3",
      "dir": "minimax-m3",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "3.27M",
      "cost": "$1.07",
      "wall": "14m 58s"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "wall": "2m 50s"
    },
    "kimi-k2.7": {
      "name": "Kimi K2.7",
      "dir": "kimi-k2.7",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.22M",
      "cost": "$0.98",
      "wall": "15m 16s"
    },
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "22.88M",
      "cost": "$123.89"
    },
    "glm-5.2": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.13M",
      "cost": "$1.26",
      "wall": "12m 18s"
    },
    "qwen3.6-35b": {
      "name": "Qwen 3.6 35B",
      "dir": "qwen3.6-35b",
      "views": [
        "landing"
      ],
      "harness": "grok-build",
      "tokens": "7.2M",
      "cost": "$1.14"
    },
    "gpt-5": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "codex",
      "imageModel": "gpt-image",
      "tokens": "104K",
      "wall": "10m 29s"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-9",
  "tag": "R9",
  "title": "Kodomo no Hi",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "landing",
    "dashboard",
    "immersive"
  ],
  "blindOrder": [
    "grok-4.3",
    "deepseek-v4",
    "opus-4.8",
    "kimi-k2.7",
    "composer",
    "qwen3.7-max",
    "glm-5.2",
    "minimax-m3",
    "gpt-5",
    "fugu",
    "qwen3.6-35b",
    "fugu-ultra"
  ],
  "models": {
    "grok-4.3": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine"
    },
    "deepseek-v4": {
      "name": "DeepSeek V4",
      "dir": "deepseek-v4",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "1.89M",
      "cost": "$0.84"
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "claude-code",
      "imageModel": "Grok Imagine"
    },
    "kimi-k2.7": {
      "name": "Kimi K2.7",
      "dir": "kimi-k2.7",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "2.13M",
      "cost": "$1.72"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine"
    },
    "qwen3.7-max": {
      "name": "Qwen 3.7 Max",
      "dir": "qwen3.7-max",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "2.83M",
      "cost": "$3.66"
    },
    "glm-5.2": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "4.16M",
      "cost": "$4.22"
    },
    "minimax-m3": {
      "name": "MiniMax M3",
      "dir": "minimax-m3",
      "views": [
        "landing",
        "immersive"
      ],
      "harness": "grok-build",
      "tokens": "3.23M",
      "cost": "$0.99"
    },
    "gpt-5": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "codex",
      "imageModel": "gpt-image",
      "tokens": "167K"
    },
    "fugu": {
      "name": "Fugu",
      "dir": "fugu",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "4.73M",
      "cost": "$12.44"
    },
    "qwen3.6-35b": {
      "name": "Qwen 3.6 35B",
      "dir": "qwen3.6-35b",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "2.97M",
      "cost": "$0.47"
    },
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "10.36M",
      "cost": "$54.95"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-8",
  "tag": "R8",
  "title": "Kodomo no Hi",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "landing",
    "dashboard",
    "immersive"
  ],
  "blindOrder": [
    "grok-4.3",
    "composer",
    "qwen-3.5",
    "glm-5.2",
    "gpt-5",
    "opus-4.8"
  ],
  "models": {
    "grok-4.3": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "116K",
      "cost": "$0.72"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "gpt-image-2",
      "tokens": "81K",
      "cost": "$0.79"
    },
    "qwen-3.5": {
      "name": "Qwen3.5 35B",
      "dir": "qwen-3.5",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "2.9M",
      "cost": "$0.43"
    },
    "glm-5.2": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "463K",
      "cost": "$1.48"
    },
    "gpt-5": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "landing",
        "dashboard"
      ],
      "harness": "codex",
      "imageModel": "gpt-image-2",
      "tokens": "397K",
      "cost": "$8.06"
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "landing",
        "dashboard",
        "immersive"
      ],
      "harness": "claude-code",
      "imageModel": "nano-banana-pro",
      "tokens": "154K",
      "cost": "$16.68"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-7",
  "tag": "R7",
  "title": "Kodomo no Hi",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "embodiment",
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "grok-4.3",
    "composer",
    "glm-5.2",
    "fusion",
    "fugu-ultra",
    "gpt-5",
    "opus-4.8"
  ],
  "models": {
    "grok-4.3": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "174K",
      "cost": "$0.69"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "gpt-image-2",
      "tokens": "127K",
      "cost": "$1.11"
    },
    "glm-5.2": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "683K",
      "cost": "$2.49"
    },
    "fusion": {
      "name": "Fusion",
      "dir": "fusion",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine"
    },
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "harness": "grok-build",
      "imageModel": "Grok Imagine",
      "tokens": "885K",
      "cost": "$18.07"
    },
    "gpt-5": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "harness": "codex",
      "imageModel": "gpt-image-2",
      "tokens": "722K",
      "cost": "$8.17"
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "harness": "claude-code",
      "imageModel": "nano-banana-pro",
      "tokens": "191K",
      "cost": "$23.19"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-6",
  "tag": "R6",
  "title": "Kodomo no Hi",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "embodiment",
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "grok-4.3",
    "composer",
    "glm-5.2",
    "fugu-ultra",
    "gpt-5",
    "opus-4.8"
  ],
  "models": {
    "grok-4.3": {
      "name": "Grok Build",
      "dir": "grok-4.3",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "tokens": "166K",
      "cost": "$0.23"
    },
    "composer": {
      "name": "Composer 2.5",
      "dir": "composer",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "tokens": "103K",
      "cost": "$0.61"
    },
    "glm-5.2": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "tokens": "224K",
      "cost": "$0.43"
    },
    "fugu-ultra": {
      "name": "Fugu Ultra",
      "dir": "fugu-ultra",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "tokens": "≥673K",
      "cost": "≥$5.82"
    },
    "gpt-5": {
      "name": "GPT-5.5",
      "dir": "gpt-5",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "tokens": "350K",
      "cost": "$3.09"
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ],
      "tokens": "191K",
      "cost": "$4.19"
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-5",
  "tag": "R5 · products",
  "title": "Kodomo no Hi, round 5 — products, not spec sheets",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "embodiment",
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "gpt-5"
  ],
  "models": {
    "gpt-5": {
      "name": "GPT-5",
      "dir": "gpt-5",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-4",
  "tag": "R4 · system",
  "title": "Kodomo no Hi, round 4 — complete-system prompt",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "embodiment",
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "gpt-5",
    "opus-4.8"
  ],
  "models": {
    "gpt-5": {
      "name": "GPT-5",
      "dir": "gpt-5",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-3",
  "tag": "R3 · graphic",
  "title": "Kodomo no Hi, round 3 — bright graphic",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "embodiment",
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "grok-4.3",
    "opus-4.8",
    "gpt-5"
  ],
  "models": {
    "grok-4.3": {
      "name": "Grok 4.3",
      "dir": "grok-4.3",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "gpt-5": {
      "name": "GPT-5",
      "dir": "gpt-5",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi-2",
  "tag": "R2 · airy",
  "title": "Kodomo no Hi, take two — airy & fresh",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "embodiment",
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "grok-4.3",
    "gpt-5",
    "opus-4.8",
    "glm-5.2"
  ],
  "models": {
    "grok-4.3": {
      "name": "Grok 4.3",
      "dir": "grok-4.3",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "gpt-5": {
      "name": "GPT-5",
      "dir": "gpt-5",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "glm-5.2": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    }
  },
  "judged": false
},
{
  "slug": "kodomo-no-hi",
  "tag": "R1 · dark",
  "title": "Kodomo no Hi — four models, blind",
  "eyebrow": "",
  "blurb": "",
  "views": [
    "embodiment",
    "landing",
    "dashboard"
  ],
  "blindOrder": [
    "grok-4.3",
    "opus-4.8",
    "gpt-5",
    "glm-5.2"
  ],
  "models": {
    "grok-4.3": {
      "name": "Grok 4.3",
      "dir": "grok-4.3",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "opus-4.8": {
      "name": "Opus 4.8",
      "dir": "opus-4.8",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "gpt-5": {
      "name": "GPT-5",
      "dir": "gpt-5",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    },
    "glm-5.2": {
      "name": "GLM 5.2",
      "dir": "glm-5.2",
      "views": [
        "embodiment",
        "landing",
        "dashboard"
      ]
    }
  },
  "judged": false
}
];
