"use client";

import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Accordion from "@radix-ui/react-accordion";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Progress from "@radix-ui/react-progress";
import * as Separator from "@radix-ui/react-separator";
import * as Avatar from "@radix-ui/react-avatar";
import * as Switch from "@radix-ui/react-switch";
import {
  StarFilledIcon,
  RocketIcon,
  Cross2Icon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  StarIcon,
  BellIcon,
  LightningBoltIcon,
  MagicWandIcon,
  MixerHorizontalIcon,
  BarChartIcon,
  PersonIcon,
  HeartFilledIcon,
  GlobeIcon,
  SewingPinFilledIcon,
} from "@radix-ui/react-icons";

const styles = `
  :root {
    --pink: #FF6B9D;
    --blue: #00D4FF;
    --purple: #1A0A2E;
    --white: #F0E6FF;
    --panel: rgba(240, 230, 255, 0.14);
    --panel-strong: rgba(240, 230, 255, 0.2);
    --line: rgba(240, 230, 255, 0.22);
    --shadow: 0 20px 60px rgba(0, 0, 0, 0.42);
    --glow-pink: 0 0 0 1px rgba(255, 107, 157, 0.24), 0 0 28px rgba(255, 107, 157, 0.28);
    --glow-blue: 0 0 0 1px rgba(0, 212, 255, 0.24), 0 0 28px rgba(0, 212, 255, 0.28);
    --radius: 24px;
    --radius-lg: 32px;
    --radius-sm: 18px;
    --text-soft: rgba(240, 230, 255, 0.72);
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: var(--purple); }
  body {
    font-family: Inter, system-ui, sans-serif;
    color: var(--white);
    background:
      radial-gradient(circle at 10% 20%, rgba(255, 107, 157, 0.26), transparent 26%),
      radial-gradient(circle at 85% 18%, rgba(0, 212, 255, 0.22), transparent 24%),
      radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.08), transparent 32%),
      linear-gradient(140deg, #12051f 0%, #1A0A2E 46%, #261144 100%);
    overflow-x: hidden;
    background-size: 140% 140%;
    animation: aurora 18s ease-in-out infinite alternate;
  }

  body::before,
  body::after {
    content: "";
    position: fixed;
    inset: auto;
    border-radius: 999px;
    filter: blur(8px);
    pointer-events: none;
    z-index: 0;
    animation: floaty 8s ease-in-out infinite;
  }

  body::before {
    width: 220px;
    height: 220px;
    top: 72px;
    right: 100px;
    background: radial-gradient(circle, rgba(255,107,157,0.28), rgba(255,107,157,0));
  }

  body::after {
    width: 240px;
    height: 240px;
    left: 80px;
    bottom: 60px;
    animation-delay: -3s;
    background: radial-gradient(circle, rgba(0,212,255,0.24), rgba(0,212,255,0));
  }

  a { color: inherit; text-decoration: none; }

  .neo-app {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    padding: 28px;
  }

  .shell {
    max-width: 1240px;
    margin: 0 auto;
    border: 1px solid var(--line);
    border-radius: 36px;
    background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06));
    backdrop-filter: blur(26px) saturate(140%);
    -webkit-backdrop-filter: blur(26px) saturate(140%);
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .brand-badge {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    color: white;
    background: linear-gradient(145deg, rgba(255,107,157,0.95), rgba(0,212,255,0.95));
    box-shadow: 0 14px 34px rgba(0,0,0,0.28), 0 0 34px rgba(255,107,157,0.36);
  }

  .brand h1,
  .hero-copy h2,
  .section-title,
  .card h3,
  .type-sample strong {
    font-family: "M PLUS Rounded 1c", "Baloo 2", system-ui, sans-serif;
  }

  .brand h1 {
    margin: 0;
    font-size: 1.2rem;
    letter-spacing: 0.02em;
  }

  .brand p,
  .muted,
  .tiny,
  .eyebrow,
  .metric-label,
  .input-label,
  .type-caption {
    color: var(--text-soft);
  }

  .brand p { margin: 2px 0 0; font-size: 0.94rem; }

  .top-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .chip,
  .ghost-btn,
  .cta,
  .mini-pill,
  .tab-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    border: 1px solid rgba(240,230,255,0.2);
    color: var(--white);
    transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
  }

  .chip,
  .mini-pill {
    padding: 8px 12px;
    background: rgba(255,255,255,0.08);
    font-size: 0.88rem;
  }

  .ghost-btn,
  .cta {
    cursor: pointer;
    padding: 12px 16px;
    font-weight: 700;
    background: rgba(255,255,255,0.08);
  }

  .cta {
    background: linear-gradient(135deg, rgba(255,107,157,0.95), rgba(0,212,255,0.95));
    color: #180c2c;
    border-color: transparent;
    box-shadow: 0 14px 28px rgba(0,212,255,0.26);
  }

  .ghost-btn:hover,
  .cta:hover,
  .tab-pill:hover,
  .mini-pill:hover {
    transform: translateY(-2px);
  }

  .cta:focus-visible,
  .ghost-btn:focus-visible,
  .tab-pill:focus-visible,
  .dialog-close:focus-visible,
  .field:focus-visible,
  .text-area:focus-visible,
  .select-trigger:focus-visible,
  .switch-root:focus-visible,
  .checkbox-root:focus-visible {
    outline: none;
    box-shadow: var(--glow-pink), 0 0 0 4px rgba(255, 107, 157, 0.16);
  }

  .main {
    padding: 22px;
    display: grid;
    gap: 22px;
  }

  .hero {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: 28px;
    display: grid;
    grid-template-columns: 1.2fr 0.9fr;
    gap: 24px;
    background:
      linear-gradient(120deg, rgba(255, 107, 157, 0.18), rgba(255,255,255,0.05) 38%, rgba(0, 212, 255, 0.12)),
      rgba(255,255,255,0.06);
    backdrop-filter: blur(18px);
  }

  .hero::before,
  .hero::after,
  .sparkle,
  .sparkle.two,
  .sparkle.three {
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
  }

  .hero::before {
    content: "";
    width: 240px;
    height: 240px;
    right: -40px;
    top: -80px;
    background: radial-gradient(circle, rgba(0,212,255,0.3), transparent 70%);
  }

  .hero::after {
    content: "";
    width: 300px;
    height: 300px;
    left: -110px;
    bottom: -160px;
    background: radial-gradient(circle, rgba(255,107,157,0.24), transparent 70%);
  }

  .sparkle {
    width: 12px;
    height: 12px;
    top: 28px;
    right: 180px;
    background: linear-gradient(135deg, var(--blue), white);
    box-shadow: 0 0 18px rgba(0,212,255,0.8);
    animation: twinkle 2.8s ease-in-out infinite;
  }

  .sparkle.two {
    top: auto;
    bottom: 46px;
    right: 340px;
    width: 9px;
    height: 9px;
    background: linear-gradient(135deg, white, var(--pink));
    box-shadow: 0 0 18px rgba(255,107,157,0.8);
    animation-delay: -1.2s;
  }

  .sparkle.three {
    top: 96px;
    right: 54px;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, var(--pink), var(--blue));
    animation-delay: -0.6s;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    width: fit-content;
    font-weight: 700;
  }

  .hero-copy h2 {
    margin: 0;
    font-size: clamp(2.3rem, 5vw, 4rem);
    line-height: 0.96;
    letter-spacing: -0.03em;
  }

  .gradient-text {
    background: linear-gradient(90deg, #fff3fb 0%, #ff9cc0 36%, #8ef1ff 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .hero-copy p {
    max-width: 62ch;
    margin: 16px 0 20px;
    color: rgba(240,230,255,0.86);
    line-height: 1.6;
    font-size: 1.02rem;
  }

  .hero-actions,
  .hero-stats,
  .team-list,
  .quick-tags,
  .swatches,
  .mini-metrics,
  .card-actions,
  .setting-row,
  .task-list,
  .type-stack {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .hero-stats { margin-top: 18px; }

  .metric {
    min-width: 140px;
    padding: 14px 16px;
    border-radius: 20px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  }

  .metric strong {
    display: block;
    font-size: 1.4rem;
    margin-top: 4px;
  }

  .hero-panel,
  .card,
  .stat-card,
  .dialog-card {
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: rgba(255,255,255,0.09);
    backdrop-filter: blur(18px);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 44px rgba(0,0,0,0.22);
  }

  .hero-panel {
    padding: 18px;
    display: grid;
    gap: 14px;
    align-self: stretch;
  }

  .panel-top {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
  }

  .status-ring {
    width: 84px;
    height: 84px;
    border-radius: 999px;
    padding: 9px;
    background: conic-gradient(var(--pink), var(--blue), var(--pink));
    box-shadow: 0 0 26px rgba(0,212,255,0.24);
  }

  .status-ring-inner {
    width: 100%;
    height: 100%;
    border-radius: 999px;
    background: rgba(26,10,46,0.88);
    display: grid;
    place-items: center;
    text-align: center;
    font-size: 0.8rem;
  }

  .status-ring-inner strong { display: block; font-size: 1.2rem; }

  .grid-tabs {
    display: grid;
    gap: 18px;
  }

  .tabs-list {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--line);
    width: fit-content;
  }

  .tab-pill {
    cursor: pointer;
    padding: 10px 16px;
    background: transparent;
    font-weight: 700;
  }

  .tab-pill[data-state="active"] {
    background: linear-gradient(135deg, rgba(255,107,157,0.24), rgba(0,212,255,0.24));
    border-color: rgba(255,255,255,0.26);
    box-shadow: var(--glow-blue);
  }

  .content-grid,
  .lab-grid,
  .settings-grid,
  .workflow-grid {
    display: grid;
    gap: 18px;
  }

  .content-grid {
    grid-template-columns: 1.2fr 0.8fr;
  }

  .workflow-grid {
    grid-template-columns: 1fr 1fr;
  }

  .lab-grid,
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card,
  .stat-card {
    padding: 20px;
  }

  .section-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .section-title {
    margin: 0;
    font-size: 1.26rem;
  }

  .card h3 {
    margin: 0;
    font-size: 1.08rem;
  }

  .card p { line-height: 1.55; }

  .mini-metrics { margin-top: 14px; }

  .mini-metric {
    flex: 1 1 140px;
    padding: 14px;
    border-radius: 18px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
  }

  .mini-metric strong {
    display: block;
    font-size: 1.3rem;
    margin-top: 8px;
  }

  .progress-row { margin: 14px 0; }
  .progress-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    font-size: 0.94rem;
  }

  .progress-root {
    position: relative;
    overflow: hidden;
    height: 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.12);
  }

  .progress-indicator {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--pink), var(--blue));
    box-shadow: 0 0 18px rgba(0,212,255,0.35);
    transition: transform 600ms ease;
  }

  .team-item,
  .task-item,
  .setting-row,
  .palette-item,
  .type-sample,
  .timeline-item {
    padding: 14px;
    border-radius: 18px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
  }

  .team-list,
  .task-list,
  .swatches,
  .type-stack { display: grid; }

  .team-list,
  .type-stack { gap: 12px; }

  .team-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
  }

  .avatar-root {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.22);
    box-shadow: 0 0 18px rgba(255,107,157,0.2);
  }

  .avatar-fallback {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, rgba(255,107,157,0.8), rgba(0,212,255,0.8));
    color: #12051f;
    font-weight: 900;
  }

  .mono {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.9rem;
  }

  .timeline-item { margin-top: 12px; }
  .timeline-item strong { display: block; margin-bottom: 6px; }

  .task-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
  }

  .checkbox-root {
    width: 24px;
    height: 24px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.25);
    display: inline-grid;
    place-items: center;
    background: rgba(255,255,255,0.08);
    color: #130723;
    cursor: pointer;
  }

  .checkbox-root[data-state="checked"] {
    background: linear-gradient(135deg, var(--pink), var(--blue));
    box-shadow: var(--glow-pink);
  }

  .input-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .input-block {
    display: grid;
    gap: 8px;
  }

  .input-block.full { grid-column: 1 / -1; }

  .field,
  .select-trigger,
  .text-area {
    width: 100%;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.18);
    background: rgba(255,255,255,0.08);
    color: var(--white);
    padding: 14px 16px;
    font-size: 0.97rem;
  }

  input.field::placeholder,
  textarea.text-area::placeholder { color: rgba(240,230,255,0.44); }

  .text-area {
    min-height: 110px;
    resize: vertical;
  }

  .select-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
  }

  .select-content {
    overflow: hidden;
    border-radius: 18px;
    background: rgba(22,11,39,0.94);
    backdrop-filter: blur(18px);
    border: 1px solid rgba(255,255,255,0.16);
    box-shadow: var(--shadow);
  }

  .select-viewport { padding: 8px; }

  .select-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 14px;
    color: var(--white);
    cursor: pointer;
    position: relative;
    user-select: none;
  }

  .select-item[data-highlighted] {
    outline: none;
    background: linear-gradient(135deg, rgba(255,107,157,0.24), rgba(0,212,255,0.24));
  }

  .select-item-indicator {
    position: absolute;
    right: 12px;
    display: inline-flex;
  }

  .swatches {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .palette-item {
    display: grid;
    gap: 10px;
  }

  .swatch {
    height: 76px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.18);
  }

  .type-sample strong { display: block; margin-bottom: 6px; }

  .display-xl { font-size: 2.7rem; line-height: 0.95; }
  .display-md { font-size: 1.8rem; }
  .body-lg { font-size: 1.02rem; line-height: 1.7; }
  .code-sample {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.9rem;
    color: #bff6ff;
  }

  .separator {
    background: linear-gradient(90deg, rgba(255,107,157,0.4), rgba(0,212,255,0.4));
    height: 1px;
    margin: 16px 0;
  }

  .accordion-item {
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(255,255,255,0.05);
    overflow: hidden;
    margin-top: 12px;
  }

  .accordion-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    background: transparent;
    border: none;
    color: var(--white);
    font: inherit;
    cursor: pointer;
  }

  .accordion-content {
    padding: 0 16px 16px;
    color: rgba(240,230,255,0.82);
    line-height: 1.6;
  }

  .switch-root {
    width: 54px;
    height: 32px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.16);
    position: relative;
    cursor: pointer;
  }

  .switch-root[data-state="checked"] {
    background: linear-gradient(135deg, rgba(255,107,157,0.8), rgba(0,212,255,0.9));
    box-shadow: var(--glow-blue);
  }

  .switch-thumb {
    display: block;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: white;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    transform: translateX(3px);
    transition: transform 180ms ease;
    will-change: transform;
  }

  .switch-root[data-state="checked"] .switch-thumb {
    transform: translateX(25px);
  }

  .setting-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 14px;
    margin-top: 12px;
  }

  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(10, 4, 18, 0.72);
    backdrop-filter: blur(8px);
  }

  .dialog-content {
    position: fixed;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 560px);
    padding: 22px;
    z-index: 50;
  }

  .dialog-card { padding: 22px; position: relative; }

  .dialog-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.16);
    background: rgba(255,255,255,0.08);
    color: var(--white);
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .footer-note {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    padding: 4px 4px 2px;
    color: var(--text-soft);
    font-size: 0.9rem;
  }

  @keyframes twinkle {
    0%, 100% { transform: scale(0.8) rotate(0deg); opacity: 0.5; }
    50% { transform: scale(1.35) rotate(25deg); opacity: 1; }
  }

  @keyframes floaty {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-12px); }
  }

  @media (max-width: 1080px) {
    .hero,
    .content-grid,
    .workflow-grid,
    .lab-grid,
    .settings-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .neo-app { padding: 14px; }
    .topbar { flex-direction: column; align-items: stretch; }
    .hero { padding: 22px; }
    .input-grid,
    .swatches {
      grid-template-columns: 1fr;
    }
    .footer-note {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

const swatches = [
  { name: "Neon Pink", hex: "#FF6B9D", tone: "Primary delight", bg: "linear-gradient(135deg, #FF6B9D, #ff95b8)" },
  { name: "Electric Blue", hex: "#00D4FF", tone: "Action energy", bg: "linear-gradient(135deg, #00D4FF, #95efff)" },
  { name: "Dark Purple", hex: "#1A0A2E", tone: "Ambient depth", bg: "linear-gradient(135deg, #1A0A2E, #2b1551)" },
  { name: "Soft White", hex: "#F0E6FF", tone: "Frosted ink", bg: "linear-gradient(135deg, #F0E6FF, #ffffff)" },
];

const team = [
  { name: "Mika", role: "Motion designer", mood: "Glow sync ready", fallback: "M" },
  { name: "Ren", role: "UI engineer", mood: "Shipping dialog polish", fallback: "R" },
  { name: "Airi", role: "Brand strategist", mood: "Palette review in 12m", fallback: "A" },
];

export function NeoKawaiiTech() {
  return (
    <div className="neo-app">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Baloo+2:wght@600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      <style>{styles}</style>

      <Tooltip.Provider delayDuration={120}>
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <div className="brand-badge">
                <StarFilledIcon width={24} height={24} />
              </div>
              <div>
                <h1>Yume Ops ✦ Neo-Kawaii Tech</h1>
                <p>Realtime launch cockpit for dreamy digital product teams</p>
              </div>
            </div>

            <div className="top-actions">
              <span className="chip"><HeartFilledIcon /> 92% joy signal</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button className="ghost-btn" type="button"><BellIcon /> 3 nudges</button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content sideOffset={8} className="chip">Gentle reminders with sparkle priority ✨</Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>

              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button className="cta" type="button"><MagicWandIcon /> New launch recipe</button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay" />
                  <Dialog.Content className="dialog-content">
                    <div className="dialog-card">
                      <Dialog.Close asChild>
                        <button className="dialog-close" aria-label="Close dialog"><Cross2Icon /></button>
                      </Dialog.Close>
                      <div className="section-head">
                        <div>
                          <p className="eyebrow"><RocketIcon /> Launch planner</p>
                          <Dialog.Title asChild>
                            <h3 className="section-title">Compose a kawaii activation flow</h3>
                          </Dialog.Title>
                        </div>
                      </div>
                      <p className="muted">Bundle copy, visuals, and community check-ins into one soft-glow workflow.</p>
                      <div className="input-grid" style={{ marginTop: 16 }}>
                        <label className="input-block">
                          <span className="input-label">Campaign name</span>
                          <input className="field" placeholder="Moonbeam onboarding" />
                        </label>
                        <label className="input-block">
                          <span className="input-label">Aura mode</span>
                          <Select.Root defaultValue="playful">
                            <Select.Trigger className="select-trigger" aria-label="Aura mode">
                              <Select.Value />
                              <Select.Icon><ChevronDownIcon /></Select.Icon>
                            </Select.Trigger>
                            <Select.Portal>
                              <Select.Content className="select-content" position="popper">
                                <Select.Viewport className="select-viewport">
                                  <Select.Item value="playful" className="select-item">
                                    <Select.ItemText>Playful sparkle</Select.ItemText>
                                    <Select.ItemIndicator className="select-item-indicator"><CheckIcon /></Select.ItemIndicator>
                                  </Select.Item>
                                  <Select.Item value="precision" className="select-item">
                                    <Select.ItemText>Precision glow</Select.ItemText>
                                    <Select.ItemIndicator className="select-item-indicator"><CheckIcon /></Select.ItemIndicator>
                                  </Select.Item>
                                  <Select.Item value="midnight" className="select-item">
                                    <Select.ItemText>Midnight dream</Select.ItemText>
                                    <Select.ItemIndicator className="select-item-indicator"><CheckIcon /></Select.ItemIndicator>
                                  </Select.Item>
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </label>
                        <label className="input-block full">
                          <span className="input-label">Prompt capsule</span>
                          <textarea className="text-area" defaultValue="Animate the signup reveal with neon stars, keep handoff cards glassy, and highlight milestones with soft badge glows." />
                        </label>
                      </div>
                      <div className="hero-actions" style={{ marginTop: 18 }}>
                        <button className="cta" type="button"><LightningBoltIcon /> Start recipe</button>
                        <button className="ghost-btn" type="button"><MixerHorizontalIcon /> Save draft</button>
                      </div>
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          </header>

          <main className="main">
            <section className="hero">
              <span className="sparkle" />
              <span className="sparkle two" />
              <span className="sparkle three" />
              <div className="hero-copy">
                <div className="eyebrow"><StarIcon /> Dreamboard release 04</div>
                <h2>
                  Design launches that feel <span className="gradient-text">playful, polished, and alive</span>
                </h2>
                <p>
                  Yume Ops helps a product design squad coordinate launch moments, story beats, and UI polish in one frosted glass control room. Tabs guide the team from overview to workflow, while color and type labs keep the brand universe consistent. ♡
                </p>
                <div className="hero-actions">
                  <button className="cta" type="button"><RocketIcon /> Queue tonight&apos;s launch</button>
                  <button className="ghost-btn" type="button"><GlobeIcon /> Share vibe board</button>
                </div>
                <div className="hero-stats">
                  <div className="metric">
                    <span className="metric-label">Ready automations</span>
                    <strong>14</strong>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Community pulse</span>
                    <strong>+28%</strong>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Glow QA score</span>
                    <strong>9.4/10</strong>
                  </div>
                </div>
              </div>

              <aside className="hero-panel">
                <div className="panel-top">
                  <div>
                    <p className="eyebrow"><SewingPinFilledIcon /> Tonight&apos;s focus</p>
                    <h3 style={{ margin: 0 }}>Onboarding comet path</h3>
                    <p className="muted">Balancing delight with frictionless setup</p>
                  </div>
                  <div className="status-ring">
                    <div className="status-ring-inner">
                      <div>
                        <strong>78%</strong>
                        synced
                      </div>
                    </div>
                  </div>
                </div>
                <div className="progress-row">
                  <div className="progress-head"><span>Motion readiness</span><span>86%</span></div>
                  <Progress.Root className="progress-root" value={86}>
                    <Progress.Indicator className="progress-indicator" style={{ transform: "translateX(-14%)" }} />
                  </Progress.Root>
                </div>
                <div className="progress-row">
                  <div className="progress-head"><span>Documentation sweetness</span><span>71%</span></div>
                  <Progress.Root className="progress-root" value={71}>
                    <Progress.Indicator className="progress-indicator" style={{ transform: "translateX(-29%)" }} />
                  </Progress.Root>
                </div>
                <div className="quick-tags">
                  <span className="mini-pill"><StarFilledIcon /> glass cards</span>
                  <span className="mini-pill"><LightningBoltIcon /> neon focus</span>
                  <span className="mini-pill"><HeartFilledIcon /> cute microcopy</span>
                </div>
              </aside>
            </section>

            <Tabs.Root defaultValue="overview" className="grid-tabs">
              <Tabs.List className="tabs-list" aria-label="Navigation tabs">
                <Tabs.Trigger value="overview" className="tab-pill">Overview</Tabs.Trigger>
                <Tabs.Trigger value="workflows" className="tab-pill">Workflows</Tabs.Trigger>
                <Tabs.Trigger value="brand-lab" className="tab-pill">Brand Lab</Tabs.Trigger>
                <Tabs.Trigger value="settings" className="tab-pill">Settings</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="overview">
                <div className="content-grid">
                  <section className="card">
                    <div className="section-head">
                      <div>
                        <h3>Launch constellation</h3>
                        <p className="muted">Three workstreams moving in sync across creative, engineering, and community.</p>
                      </div>
                      <span className="chip"><BarChartIcon /> live board</span>
                    </div>
                    <div className="mini-metrics">
                      <div className="mini-metric">
                        <span className="metric-label">Spark assets finalized</span>
                        <strong>42</strong>
                      </div>
                      <div className="mini-metric">
                        <span className="metric-label">Avg. response glow</span>
                        <strong>4.8m</strong>
                      </div>
                      <div className="mini-metric">
                        <span className="metric-label">Retention charm</span>
                        <strong>89%</strong>
                      </div>
                    </div>
                    <Separator.Root className="separator" decorative orientation="horizontal" />
                    <div className="timeline-item">
                      <strong>14:00 — Visual freeze</strong>
                      Motion stickers and pastel hover gradients locked for QA.
                    </div>
                    <div className="timeline-item">
                      <strong>17:30 — Creator preview</strong>
                      Invite ten beta creators to test celebratory overlays and sparkle feedback.
                    </div>
                    <div className="timeline-item">
                      <strong>20:00 — Launch pulse</strong>
                      Roll out to 30% with community alerts and animated welcome quests.
                    </div>
                  </section>

                  <aside className="card">
                    <div className="section-head">
                      <div>
                        <h3>Core team orbit</h3>
                        <p className="muted">Everyone working inside the same dreamy system.</p>
                      </div>
                      <span className="chip"><PersonIcon /> 6 online</span>
                    </div>
                    <div className="team-list">
                      {team.map((member) => (
                        <div className="team-item" key={member.name}>
                          <Avatar.Root className="avatar-root">
                            <Avatar.Fallback className="avatar-fallback">{member.fallback}</Avatar.Fallback>
                          </Avatar.Root>
                          <div>
                            <strong>{member.name}</strong>
                            <div className="muted">{member.role}</div>
                          </div>
                          <span className="chip">{member.mood}</span>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </Tabs.Content>

              <Tabs.Content value="workflows">
                <div className="workflow-grid">
                  <section className="card">
                    <div className="section-head">
                      <div>
                        <h3>Delight checklist</h3>
                        <p className="muted">Use checkboxes to track emotional polish before shipping.</p>
                      </div>
                    </div>
                    <div className="task-list">
                      <div className="task-item">
                        <Checkbox.Root className="checkbox-root" defaultChecked id="task-1">
                          <Checkbox.Indicator><CheckIcon /></Checkbox.Indicator>
                        </Checkbox.Root>
                        <label htmlFor="task-1">Gradient hover on primary CTA feels buoyant and readable</label>
                        <span className="chip">done</span>
                      </div>
                      <div className="task-item">
                        <Checkbox.Root className="checkbox-root" defaultChecked id="task-2">
                          <Checkbox.Indicator><CheckIcon /></Checkbox.Indicator>
                        </Checkbox.Root>
                        <label htmlFor="task-2">Welcome modal copy uses playful but concise microcopy</label>
                        <span className="chip">done</span>
                      </div>
                      <div className="task-item">
                        <Checkbox.Root className="checkbox-root" id="task-3">
                          <Checkbox.Indicator><CheckIcon /></Checkbox.Indicator>
                        </Checkbox.Root>
                        <label htmlFor="task-3">Focus glows meet accessibility contrast targets</label>
                        <span className="chip">reviewing</span>
                      </div>
                    </div>
                    <Separator.Root className="separator" decorative orientation="horizontal" />
                    <div className="card-actions">
                      <button className="cta" type="button"><LightningBoltIcon /> Run QA ritual</button>
                      <button className="ghost-btn" type="button"><StarFilledIcon /> Add soft confetti</button>
                    </div>
                  </section>

                  <section className="card">
                    <div className="section-head">
                      <div>
                        <h3>Launch notes</h3>
                        <p className="muted">Inputs are styled to match the frosted system.</p>
                      </div>
                      <span className="chip mono">build: nk-042</span>
                    </div>
                    <div className="input-grid">
                      <label className="input-block">
                        <span className="input-label">Owner</span>
                        <input className="field" defaultValue="Mika ✦ Motion" />
                      </label>
                      <label className="input-block">
                        <span className="input-label">Mood theme</span>
                        <Select.Root defaultValue="dreamcore">
                          <Select.Trigger className="select-trigger" aria-label="Mood theme">
                            <Select.Value />
                            <Select.Icon><ChevronDownIcon /></Select.Icon>
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content className="select-content" position="popper">
                              <Select.Viewport className="select-viewport">
                                <Select.Item value="dreamcore" className="select-item">
                                  <Select.ItemText>Dreamcore glow</Select.ItemText>
                                  <Select.ItemIndicator className="select-item-indicator"><CheckIcon /></Select.ItemIndicator>
                                </Select.Item>
                                <Select.Item value="arcade" className="select-item">
                                  <Select.ItemText>Arcade pastel</Select.ItemText>
                                  <Select.ItemIndicator className="select-item-indicator"><CheckIcon /></Select.ItemIndicator>
                                </Select.Item>
                                <Select.Item value="aurora" className="select-item">
                                  <Select.ItemText>Aurora glass</Select.ItemText>
                                  <Select.ItemIndicator className="select-item-indicator"><CheckIcon /></Select.ItemIndicator>
                                </Select.Item>
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      </label>
                      <label className="input-block full">
                        <span className="input-label">Handoff memo</span>
                        <textarea className="text-area" defaultValue="Keep the tab bar pill-shaped, preserve the pink-to-blue shimmer, and leave enough whitespace around cards so the glow can breathe." />
                      </label>
                    </div>
                    <Accordion.Root type="single" collapsible>
                      <Accordion.Item className="accordion-item" value="guideline-1">
                        <Accordion.Header>
                          <Accordion.Trigger className="accordion-trigger">How should launch cards feel? <ChevronRightIcon /></Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="accordion-content">
                          Rounded, frosted, lightly luminous, and soft enough that content remains the star instead of the chrome.
                        </Accordion.Content>
                      </Accordion.Item>
                      <Accordion.Item className="accordion-item" value="guideline-2">
                        <Accordion.Header>
                          <Accordion.Trigger className="accordion-trigger">What makes it Neo-Kawaii? <ChevronRightIcon /></Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="accordion-content">
                          Joyful gradients, emoji-like accents, glass panels, plush typography, and transitions that bounce gently instead of snapping harshly.
                        </Accordion.Content>
                      </Accordion.Item>
                    </Accordion.Root>
                  </section>
                </div>
              </Tabs.Content>

              <Tabs.Content value="brand-lab">
                <div className="lab-grid">
                  <section className="card">
                    <div className="section-head">
                      <div>
                        <h3>Color swatches</h3>
                        <p className="muted">Core palette for the scene and components.</p>
                      </div>
                    </div>
                    <div className="swatches">
                      {swatches.map((swatch) => (
                        <div className="palette-item" key={swatch.name}>
                          <div className="swatch" style={{ background: swatch.bg }} />
                          <div>
                            <strong>{swatch.name}</strong>
                            <div className="mono">{swatch.hex}</div>
                            <div className="muted">{swatch.tone}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="card">
                    <div className="section-head">
                      <div>
                        <h3>Type scale</h3>
                        <p className="muted">Rounded display, clean body, and mono accents.</p>
                      </div>
                    </div>
                    <div className="type-stack">
                      <div className="type-sample">
                        <strong className="display-xl">Sparkly Product Moments</strong>
                        <div className="type-caption">Display / M PLUS Rounded 1c</div>
                      </div>
                      <div className="type-sample">
                        <strong className="display-md">Launch rituals with soft hierarchy</strong>
                        <div className="type-caption">Heading / Baloo feeling with rounded rhythm</div>
                      </div>
                      <div className="type-sample body-lg">
                        Balanced body copy should feel airy and sweet, with enough contrast for usability and enough softness for emotional warmth.
                        <div className="type-caption">Body / Inter or system-ui</div>
                      </div>
                      <div className="type-sample code-sample">
                        const glow = \"pink + blue + blur(24px)\";
                        <div className="type-caption">Code / JetBrains Mono</div>
                      </div>
                    </div>
                  </section>
                </div>
              </Tabs.Content>

              <Tabs.Content value="settings">
                <div className="settings-grid">
                  <section className="card">
                    <div className="section-head">
                      <div>
                        <h3>Experience toggles</h3>
                        <p className="muted">Switches control ambient effects and launch guidance.</p>
                      </div>
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>Animated gradient background</strong>
                        <div className="muted">Keeps the room feeling alive without stealing focus.</div>
                      </div>
                      <Switch.Root className="switch-root" defaultChecked>
                        <Switch.Thumb className="switch-thumb" />
                      </Switch.Root>
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>Focus halo on forms</strong>
                        <div className="muted">Neon ring appears when fields are selected.</div>
                      </div>
                      <Switch.Root className="switch-root" defaultChecked>
                        <Switch.Thumb className="switch-thumb" />
                      </Switch.Root>
                    </div>
                    <div className="setting-row">
                      <div>
                        <strong>Emoji delight hints</strong>
                        <div className="muted">Surface playful cues beside high-confidence actions.</div>
                      </div>
                      <Switch.Root className="switch-root">
                        <Switch.Thumb className="switch-thumb" />
                      </Switch.Root>
                    </div>
                  </section>

                  <section className="card">
                    <div className="section-head">
                      <div>
                        <h3>System notes</h3>
                        <p className="muted">A realistic footer card for ops context and scene completion.</p>
                      </div>
                    </div>
                    <p>
                      This dashboard is structured as a launch room rather than a component inventory: the hero frames the mission, tabs split the team&apos;s real tasks, and the brand lab ensures the design language stays coherent as features evolve.
                    </p>
                    <Separator.Root className="separator" decorative orientation="horizontal" />
                    <div className="footer-note">
                      <span>Last sync: 11:42 PM JST</span>
                      <span>Theme: Neo-Kawaii Tech ✦ Frosted neon glass</span>
                    </div>
                  </section>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </main>
        </div>
      </Tooltip.Provider>
    </div>
  );
}
