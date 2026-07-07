# Katagami — Codex Project Guide

> Synchronized with `CLAUDE.md` (Claude Code) — identical rules. When you change one, mirror the other. Global rules live in `~/AGENTS.md` / `~/.claude/CLAUDE.md`; this file adds what is Katagami-specific.

## What Katagami is

Katagami is the **design commons**: an agent-managed library of design languages, each with tokens, embodiments, landing pages, and dashboards, produced by a curation pipeline and published at katagami.ai. It runs as OS apps on Temper (`katagami-commons`, `katagami-curation`).

## Sources of truth & git topology

- **Genesis is the source of truth.** `katagami/katagami-commons` and `katagami/katagami-curation` live on the Genesis git server; GitHub (`arni-labs/katagami`) is a mirror. After merging on GitHub, **push to Genesis too** and verify both sides are in sync — sync is bidirectional, and on divergence **Genesis wins; preserve Genesis-side changes**.
- Remote names mirror the project: `katagami-commons`, `katagami-curation` — never infrastructure names like `railway-*`.
- When reporting git status, state branch AND remote host. Never assume `origin` = GitHub.
- **Canonical taste rules live in the deployed Katagami app on Railway** — read all accepted taste rules from there before generating languages; the repo copy may lag.

## Working discipline

- Work in a **worktree branched from up-to-date `main`** (`codex/<short-task-name>`); never commit to `main` directly; never touch dirty checkouts. State which repo/worktree/branch you're on before mutating anything. Open a **draft PR as soon as changes begin**; one PR per repo per effort.
- **DO NOT PUNT**; no band-aid or temporary fixes; fix classes of problems generically ("so this doesn't happen again"), not the instance in front of you.
- **Definition of done**: run everything live locally end-to-end, seeded with real content, and verify in a real browser that pages render, links open, and images show — *before* handing over. **This gates every production deploy: start the server/app locally, execute the changed functionality against it, and confirm it behaves as expected BEFORE deploying — prod is never the testing ground, and green test suites do not substitute for the live local run.** Then merge, deploy, publish to Genesis, and verify the deployed system. Use **Datadog** for production diagnosis. Hand over PR links, deployment links, and live evidence. "The link doesn't open" is a failed task.
- Batch pipeline jobs run at most **10 concurrent**.

## The design contract (the katagami way)

Every generated or styled artifact — embodiments, landing pages, dashboards, previews, seed content — follows these rules:

- **No borders.** Avoid borders wherever possible, especially grey borders; never heavy borders. No decorative sidelines.
- **No emoji on buttons.** Clean, minimalistic, intentional — look at the katagami.ai main page for reference.
- **Bright and clean, never muddy.** No pastel background washes. No gradients — use blobs for organic color. Core neutrals are pure `#FFF` / `#000`.
- **≤3 accent colors**, used like highlighters. Palettes are signature-led; semantic colors (error/warning) stay a small part of the palette, never visually primary.
- **Typography**: high contrast (no dark-on-dark / light-on-light), body 17px+, table rows 14.5px+, `-0.02em` letter-spacing on display text.
- **Border-radius** only from {0, 16, 24, 9999}.
- **Spacing**: generous; padding/margin above titles — titles never stuck to container tops.
- **Hero**: landing pages get ONE large full-bleed hero image at top.
- **Previews are embodiment-grade**, never component galleries. Each design language gets bespoke embodiment + landing + dashboard under the same taste rules.
- **Diagrams**: real architecture diagrams (C4-style levels, progressive disclosure), inline SVG, inside their sections, each with an explainer underneath.
- **Motion**: respect `prefers-reduced-motion`; light mode default; 100% responsive on desktop and mobile without compromising diagrams.
- **Evolve the existing style, don't replace it.** Don't lose what works; preserve the previous version in a separate file before restyling.

## Pipeline quality

- Seed/demo content MUST be produced by the same pipeline, contracts, and quality gates as real production content — never hand-build lower-quality stand-ins.
- Design languages are referenced by URL (`https://katagami.ai/language/<id>/DESIGN.md`); honor the linked language's tokens exactly when asked to apply one.
- Embodiments must be professional-grade. Common failures to check before handoff: unstyled defaults, misalignment, inconsistent typography.

## Root cause & communication

- When something "keeps happening" or "didn't use to happen": find **what changed** (read the code, read Datadog), fix the root cause, and explain the causal story. Never stack fixes on fixes.
- Surface every error and policy denial to the human channel; silent failure is itself a bug.
- Answer the question asked, concisely, showing the real artifact (open the page) rather than describing it.
