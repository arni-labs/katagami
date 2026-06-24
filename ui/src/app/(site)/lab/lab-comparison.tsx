"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { COMPARISONS } from "./comparisons";
import type { LabComparison as LabComparisonType, LabModel, LabView } from "./comparisons";

const LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const VIEW_LABEL: Record<LabView, string> = {
  embodiment: "Embodiment",
  landing: "Landing",
  dashboard: "Dashboard",
  immersive: "Immersive",
};

// Katagami "sticker" button — sharp, NO border, hard offset shadow, lifts on hover.
const STICKER =
  "inline-flex items-center justify-center px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] shadow-[0_2px_0_#1e232d29] transition-all hover:-translate-y-[2px] hover:shadow-[0_4px_0_#1e232d29]";

// bright katagami trio for the celebration burst (no muddy matcha)
const CONFETTI = [
  "var(--yuzu)",
  "var(--ramune)",
  "var(--sakura)",
  "var(--yuzu)",
  "var(--ramune)",
];

type Particle = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  sway: number;
  life: number;
  ttl: number;
};

// Physics confetti — an upward-and-out burst with gravity, drag, tumble and flutter.
function fireConfetti(cx: number, cy: number, n = 150) {
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;inset:0;z-index:9999;pointer-events:none;overflow:hidden;";
  document.body.appendChild(container);

  const parts: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    const streamer = Math.random() < 0.18;
    const w = streamer ? 3 + Math.random() * 2 : 5 + Math.random() * 7;
    const h = streamer ? 16 + Math.random() * 18 : 7 + Math.random() * 9;
    el.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;background:${CONFETTI[i % CONFETTI.length]};border-radius:1px;will-change:transform,opacity;`;
    container.appendChild(el);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 1.15); // upward cone
    const speed = 10 + Math.random() * 15;
    parts.push({
      el,
      x: cx + (Math.random() - 0.5) * 26,
      y: cy + (Math.random() - 0.5) * 12,
      vx: Math.cos(ang) * speed + (Math.random() - 0.5) * 5,
      vy: Math.sin(ang) * speed - Math.random() * 6,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 26,
      sway: Math.random() * Math.PI * 2,
      life: 0,
      ttl: 100 + Math.random() * 60,
    });
  }

  const g = 0.34;
  const drag = 0.985;
  let frame = 0;
  function tick() {
    frame++;
    let alive = false;
    for (const p of parts) {
      if (p.life > p.ttl) {
        p.el.style.opacity = "0";
        continue;
      }
      alive = true;
      p.life++;
      p.vy += g;
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx;
      p.y += p.vy + Math.sin(p.sway + p.life * 0.16) * 1.4; // flutter
      p.rot += p.vr;
      const fade = p.life > p.ttl - 30 ? Math.max(0, (p.ttl - p.life) / 30) : 1;
      p.el.style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.rot}deg)`;
      p.el.style.opacity = String(fade);
    }
    if (alive && frame < 280) requestAnimationFrame(tick);
    else container.remove();
  }
  requestAnimationFrame(tick);
}

// deterministic PRNG so the quiz options are identical on server + client (no hydration drift)
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function makeRng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseCost(s?: string) {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

// animated count-up for the $ reveal
function CountUp({
  to,
  prefix = "",
  suffix = "",
  decimals = 2,
  duration = 750,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let mounted = true;
    const start = performance.now();
    const tick = (now: number) => {
      if (!mounted) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(to * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <>
      {prefix}
      {v.toFixed(decimals)}
      {suffix}
    </>
  );
}

type Question = { key: string; name: string; options: string[] };

// a set of surfaces for the same models — the primary round or its "no rules" variant
type SurfaceSet = {
  slug: string;
  views: LabView[];
  models: Record<string, LabModel>;
  blindOrder: string[];
  label: string;
};

// resolve a model's iframe src in a surface set + view; null if it has no design here
function resolvePreview(set: SurfaceSet | null, key: string, view: LabView) {
  if (!set || !set.models[key]) return null;
  const m = set.models[key];
  const avail = m.views ?? set.views;
  if (!avail.length) return null;
  const vw = avail.includes(view) ? view : avail[0];
  return { set, m, view: vw, base: `/lab/${set.slug}/${m.dir}` };
}

function PreviewFrame({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className: string;
}) {
  return (
    <div className={`sticker-card relative overflow-hidden ${className}`}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: "200%", height: "200%", transform: "scale(0.5)", border: 0 }}
      />
    </div>
  );
}

function NoSurface({ what }: { what: string }) {
  return (
    <div className="sticker-card relative aspect-[16/10] overflow-hidden">
      <div className="absolute inset-0 grid place-items-center bg-card px-6 text-center">
        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">{what}</p>
      </div>
    </div>
  );
}

// count up a token string like "1.11M" / "104K" / "22.88M"
function TokenCount({ value }: { value: string }) {
  const mm = value.match(/^([\d.]+)\s*(.*)$/);
  if (!mm) return <>{value}</>;
  const decimals = (mm[1].split(".")[1] || "").length;
  return <CountUp to={parseFloat(mm[1])} decimals={decimals} suffix={mm[2]} duration={820} />;
}

// one animated number + its label (money / tokens / time)
function StatChip({
  label,
  delay,
  children,
}: {
  label: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="text-center"
      style={{ animation: `lab-pop 520ms cubic-bezier(.2,.9,.3,1) ${delay}ms both` }}
    >
      <div className="font-display text-xl font-black tabular-nums tracking-[-0.02em] sm:text-3xl">
        {children}
      </div>
      <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function StatRow({ m }: { m: LabModel }) {
  const cost = parseCost(m.cost);
  if (cost == null && !m.tokens && !m.wall) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-5 sm:gap-9">
      {cost != null && (
        <StatChip label="money" delay={80}>
          <CountUp to={cost} prefix="$" />
        </StatChip>
      )}
      {m.tokens && (
        <StatChip label="tokens" delay={180}>
          <TokenCount value={m.tokens} />
        </StatChip>
      )}
      {m.wall && (
        <StatChip label="time" delay={280}>
          {m.wall}
        </StatChip>
      )}
    </div>
  );
}

function MetaLine({ m }: { m: LabModel }) {
  if (!m.harness && !m.imageModel) return null;
  return (
    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
      {[m.harness && `Harness: ${m.harness}`, m.imageModel && `Image: ${m.imageModel}`]
        .filter(Boolean)
        .join(" · ")}
    </p>
  );
}

// segmented control shared by the view tabs + the variant toggle
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="inline-flex bg-card p-1 shadow-[0_1px_0_#1e232d1f]">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-4 py-1.5 font-mono text-xs transition-colors ${
            value === o.key
              ? "bg-foreground font-bold text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// an on/off toggle switch (katagami pill)
function Switch({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="inline-flex items-center gap-2.5"
    >
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
        {label}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? "bg-foreground" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] rounded-full bg-background shadow-[0_1px_2px_#0000003d] transition-transform ${
            on ? "translate-x-[23px]" : "translate-x-[3px]"
          }`}
        />
      </span>
    </button>
  );
}

// ---- the quiz: one design at a time ----
function QuizQuestion({
  active,
  other,
  questions,
  answers,
  index,
  view,
  setView,
  onPick,
  onNext,
  onSkip,
}: {
  active: SurfaceSet;
  other: SurfaceSet | null;
  questions: Question[];
  answers: Record<string, string>;
  index: number;
  view: LabView;
  setView: (v: LabView) => void;
  onPick: (opt: string, e: React.MouseEvent<HTMLButtonElement>) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const q = questions[index];
  // prefer the active set's design; fall back to the other set if this model has none here
  let pr = resolvePreview(active, q.key, view);
  let usedSet = active;
  if (!pr && other) {
    pr = resolvePreview(other, q.key, view);
    usedSet = other;
  }
  const m = usedSet.models[q.key];
  const cost = parseCost(m.cost);
  const picked = answers[q.key];
  const answered = picked !== undefined;
  const isCorrect = picked === q.name;
  const total = questions.length;
  const answeredSoFar = questions.filter((qq) => answers[qq.key] !== undefined).length;
  const correctSoFar = questions.filter((qq) => answers[qq.key] === qq.name).length;
  const viewOpts = m.views ?? usedSet.views;

  return (
    <div
      className="mx-auto mt-6 max-w-3xl"
      style={{ animation: "quiz-in 420ms cubic-bezier(.2,.9,.3,1) both" }}
    >
      {/* progress + skip */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Question {index + 1} / {total}
          {answeredSoFar > 0 && (
            <span className="ml-2 text-foreground">· {correctSoFar} right</span>
          )}
        </span>
        <button onClick={onSkip} className={`${STICKER} bg-[var(--sakura)] px-5 text-black`}>
          Skip the quiz &rarr;
        </button>
      </div>
      {/* progress dots */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {questions.map((qq, di) => {
          const a = answers[qq.key];
          let color = "bg-muted";
          if (a) color = a === qq.name ? "bg-[var(--yuzu)]" : "bg-foreground/30";
          if (di === index) color = "bg-foreground";
          return <span key={qq.key} className={`h-2 w-2 rounded-full ${color}`} />;
        })}
      </div>

      {/* view toggle */}
      {viewOpts.length > 1 && (
        <div className="mt-4">
          <Segmented
            options={viewOpts.map((v) => ({ key: v, label: VIEW_LABEL[v] }))}
            value={pr?.view ?? viewOpts[0]}
            onChange={(v) => setView(v as LabView)}
          />
        </div>
      )}

      {/* the design */}
      <div className="mt-3">
        {pr ? (
          <PreviewFrame
            src={`${pr.base}/${pr.view}.html`}
            title={`Design ${index + 1}`}
            className="aspect-[16/10] w-full"
          />
        ) : (
          <NoSurface what="This model produced no design here." />
        )}
        {usedSet !== active && (
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Showing the “{usedSet.label}” version — none under “{active.label}”.
          </p>
        )}
      </div>

      {/* the question */}
      <h2 className="mt-6 text-center font-display text-xl font-black tracking-[-0.02em] sm:text-2xl">
        Which model made this?
      </h2>

      {/* the two choices */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {q.options.map((opt, oi) => {
          let cls =
            "bg-card text-foreground hover:-translate-y-[3px] hover:rotate-[-0.5deg] hover:shadow-[0_7px_0_#1e232d29]";
          let anim = `opt-in 380ms cubic-bezier(.2,.9,.3,1) ${oi * 70}ms both`;
          if (answered) {
            if (opt === q.name) {
              // the right answer — bright yuzu; celebratory pop if they chose it
              cls = "bg-[var(--yuzu)] text-black";
              anim = isCorrect
                ? "correct-pop 560ms cubic-bezier(.2,.9,.3,1) both"
                : "lab-pop 460ms cubic-bezier(.2,.9,.3,1) both";
            } else if (opt === picked) {
              // their wrong pick — sakura pink + a shake
              cls = "bg-[var(--sakura)] text-black";
              anim = "wrong-shake 520ms ease both";
            } else {
              cls = "bg-card text-muted-foreground opacity-40";
            }
          }
          return (
            <button
              key={opt}
              disabled={answered}
              onClick={(e) => onPick(opt, e)}
              style={{ animation: anim }}
              className={`flex items-center justify-center px-5 py-6 text-center font-display text-lg font-black tracking-[-0.02em] shadow-[0_3px_0_#1e232d29] transition-all sm:px-6 sm:py-7 sm:text-2xl ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* the reveal */}
      {answered && (
        <div
          className="mt-6 text-center"
          style={{ animation: "lab-pop 480ms cubic-bezier(.2,.9,.3,1) both" }}
        >
          <p className="font-display text-lg font-black tracking-[-0.02em]">
            {isCorrect ? (
              <>
                <span className="marker">
                  <span className="marker-fill" style={{ background: "var(--yuzu)" }} />
                  <span className="marker-text">Nailed it</span>
                </span>{" "}
                &mdash; it&rsquo;s {q.name}
              </>
            ) : (
              <>
                <span className="marker">
                  <span className="marker-fill" style={{ background: "var(--sakura)" }} />
                  <span className="marker-text">Not quite</span>
                </span>{" "}
                &mdash; it&rsquo;s {q.name}{" "}
                <span className="text-muted-foreground">&middot; you said {picked}</span>
              </>
            )}
          </p>
          <StatRow m={m} />
          <MetaLine m={m} />
          <button onClick={onNext} className={`${STICKER} mt-5 bg-foreground text-background`}>
            {index + 1 < total ? "Next design →" : "See your score →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---- the score screen ----
function ScoreScreen({
  correct,
  total,
  onDetails,
}: {
  correct: number;
  total: number;
  onDetails: () => void;
}) {
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    fireConfetti(w / 2, h * 0.4, 200);
    const t1 = setTimeout(() => fireConfetti(w * 0.3, h * 0.36, 120), 240);
    const t2 = setTimeout(() => fireConfetti(w * 0.7, h * 0.36, 120), 440);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const pct = total ? correct / total : 0;
  const quip =
    pct === 1
      ? "Flawless. You know these models cold."
      : pct >= 0.6
        ? "Sharp eye."
        : pct >= 0.3
          ? "Not bad — the tells are subtle."
          : "The models are sneakier than they look.";

  return (
    <div
      className="mx-auto mt-10 max-w-lg text-center"
      style={{ animation: "quiz-in 520ms cubic-bezier(.2,.9,.3,1) both" }}
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ramune)]">
        Your score
      </p>
      <div className="mt-2 font-display text-7xl font-black tabular-nums tracking-[-0.03em] sm:text-8xl">
        <CountUp to={correct} decimals={0} />
        <span className="text-muted-foreground">/{total}</span>
      </div>
      <p className="mt-3 text-[15px] text-muted-foreground">{quip}</p>
      <button
        onClick={onDetails}
        className={`${STICKER} mt-7 bg-foreground px-6 py-3 text-background`}
      >
        See all designs &amp; details &rarr;
      </button>
    </div>
  );
}

// ---- browse all designs: a pager (1 or 2 at a time — never all 12; immersive is heavy) ----
function DetailsGrid({
  active,
  view,
  setView,
  answers,
  correct,
  onReplay,
}: {
  active: SurfaceSet;
  view: LabView;
  setView: (v: LabView) => void;
  answers: Record<string, string>;
  correct: number;
  onReplay: () => void;
}) {
  const order = active.blindOrder;
  const n = order.length;
  // only the immersive view pages (WebGL is heavy); landing/dashboard show everything at once
  const paged = view === "immersive";
  const [perPage, setPerPage] = useState(1);
  const [start, setStart] = useState(0);
  const maxStart = Math.max(0, n - perPage);
  const clamped = Math.min(start, maxStart);
  const pageKeys = paged ? order.slice(clamped, clamped + perPage) : order;
  const atStart = clamped <= 0;
  const atEnd = clamped + perPage >= n;

  // responsive: 2 designs side-by-side on desktop, 1 on mobile (no manual toggle)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setPerPage(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setStart((s) => Math.max(0, Math.min(s, maxStart) - perPage));
      else if (e.key === "ArrowRight")
        setStart((s) => Math.min(maxStart, Math.min(s, maxStart) + perPage));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [maxStart, perPage]);

  const pos =
    perPage === 1
      ? `${clamped + 1} / ${n}`
      : `${clamped + 1}–${Math.min(clamped + perPage, n)} / ${n}`;

  const nav = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={() => setStart(Math.max(0, clamped - perPage))}
        disabled={atStart}
        className={`${STICKER} bg-card text-foreground disabled:pointer-events-none disabled:opacity-30`}
      >
        &larr; Prev
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        {order.map((k, di) => {
          const here = di >= clamped && di < clamped + perPage;
          return (
            <button
              key={k}
              aria-label={`Go to design ${di + 1}`}
              onClick={() => setStart(Math.min(di, maxStart))}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                here ? "bg-foreground" : "bg-muted hover:bg-foreground/40"
              }`}
            />
          );
        })}
      </div>
      <button
        onClick={() => setStart(Math.min(maxStart, clamped + perPage))}
        disabled={atEnd}
        className={`${STICKER} bg-foreground text-background disabled:pointer-events-none disabled:opacity-30`}
      >
        Next &rarr;
      </button>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 mt-6 flex flex-wrap items-center gap-3 bg-background/85 px-4 py-3 backdrop-blur-sm">
        <Segmented
          options={active.views.map((v) => ({ key: v, label: VIEW_LABEL[v] }))}
          value={active.views.includes(view) ? view : active.views[0]}
          onChange={(v) => setView(v as LabView)}
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            You got {correct}/{n}
          </span>
          <button onClick={onReplay} className={`${STICKER} bg-card text-foreground`}>
            Replay quiz
          </button>
        </div>
      </div>

      {paged && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {nav}
          <span className="shrink-0 font-mono text-[12px] font-bold uppercase tracking-[0.16em] tabular-nums text-muted-foreground">
            {pos}
          </span>
        </div>
      )}

      <div className={`mt-6 grid gap-7 ${paged && perPage === 1 ? "mx-auto max-w-3xl grid-cols-1" : "md:grid-cols-2"}`}>
        {pageKeys.map((key) => {
          const i = order.indexOf(key);
          const m = active.models[key];
          const label = LABELS[i];
          const base = `/lab/${active.slug}/${m.dir}`;
          const hasView = (m.views ?? active.views).includes(view);
          const guessed = answers[key];
          const aspect = paged && perPage === 1 ? "aspect-[16/10]" : "aspect-[4/3]";
          return (
            <div
              key={key}
              className="flex flex-col gap-3"
              style={{ animation: "quiz-in 360ms cubic-bezier(.2,.9,.3,1) both" }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground font-display text-lg font-bold text-background">
                  {label}
                </span>
                <span
                  className="inline-block font-mono text-sm font-bold tracking-wide"
                  style={{ animation: "lab-pop 440ms cubic-bezier(.2,.9,.3,1) both" }}
                >
                  {m.name}
                </span>
                {(m.cost || m.tokens || m.wall) && (
                  <span
                    className="inline-block text-[13px] tabular-nums text-muted-foreground"
                    style={{ animation: "lab-pop 440ms cubic-bezier(.2,.9,.3,1) 110ms both" }}
                  >
                    {m.cost}
                    {(m.tokens || m.wall) && (
                      <span className="opacity-60">
                        {m.cost ? " · " : ""}
                        {[m.tokens && `${m.tokens} tok`, m.wall].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                )}
              </div>

              {guessed && (
                <p className="text-[13px] font-bold">
                  {guessed === m.name ? (
                    <span className="marker">
                      <span className="marker-fill" style={{ background: "var(--yuzu)" }} />
                      <span className="marker-text">Correct — you got it</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      You guessed {guessed} — it&rsquo;s {m.name}
                    </span>
                  )}
                </p>
              )}

              <MetaLine m={m} />

              {hasView ? (
                <PreviewFrame
                  src={`${base}/${view}.html`}
                  title={`Model ${label} — ${view}`}
                  className={aspect}
                />
              ) : (
                <div className={`sticker-card relative ${aspect} overflow-hidden`}>
                  <div className="absolute inset-0 grid place-items-center bg-card px-6 text-center">
                    <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {m.note ?? `No ${VIEW_LABEL[view].toLowerCase()} — this model didn’t produce one.`}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-5 text-[13px]">
                {hasView && (
                  <a
                    href={`${base}/${view}.html`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Open {view}
                  </a>
                )}
                <a
                  href={`${base}/DESIGN.md`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground underline-offset-4 hover:underline"
                >
                  Design notes
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {paged && <div className="mt-8">{nav}</div>}
    </>
  );
}

export function LabComparison({ comparison: c }: { comparison: LabComparisonType }) {
  const [mode, setMode] = useState<"quiz" | "details">("quiz");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [view, setView] = useState<LabView>(
    c.views.includes("landing") ? "landing" : c.views[0],
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [variantMode, setVariantMode] = useState<"primary" | "variant">("primary");

  const primarySet: SurfaceSet = {
    slug: c.slug,
    views: c.views,
    models: c.models,
    blindOrder: c.blindOrder,
    label: c.variant?.primaryLabel ?? "Primary",
  };
  const variantSet: SurfaceSet | null = c.variant
    ? {
        slug: c.variant.slug,
        views: c.variant.views,
        models: c.variant.models,
        blindOrder: c.blindOrder,
        label: c.variant.label,
      }
    : null;
  const active = variantMode === "variant" && variantSet ? variantSet : primarySet;
  const other = active === primarySet ? variantSet : primarySet;

  const switchVariant = (next: "primary" | "variant") => {
    setVariantMode(next);
    const set = next === "variant" && variantSet ? variantSet : primarySet;
    if (!set.views.includes(view)) setView(set.views.includes("landing") ? "landing" : set.views[0]);
  };

  const questions = useMemo<Question[]>(() => {
    const r = makeRng(hashStr(c.slug));
    const allNames = Array.from(new Set(c.blindOrder.map((k) => c.models[k].name)));
    return c.blindOrder.map((key) => {
      const name = c.models[key].name;
      const decoys = allNames
        .filter((n) => n !== name)
        .sort(() => r() - 0.5)
        .slice(0, 1);
      const options = [name, ...decoys].sort(() => r() - 0.5);
      return { key, name, options };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.slug]);

  const total = questions.length;
  const correct = c.blindOrder.filter((k) => answers[k] === c.models[k].name).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      <style>{`
        @keyframes lab-pop{0%{opacity:0;transform:translateY(8px) scale(.85)}60%{transform:translateY(0) scale(1.06)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes quiz-in{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes opt-in{0%{opacity:0;transform:translateY(10px) scale(.98)}100%{opacity:1;transform:none}}
        @keyframes correct-pop{0%{transform:scale(.9)}45%{transform:scale(1.09)}100%{transform:scale(1.04)}}
        @keyframes wrong-shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-9px)}30%{transform:translateX(8px)}45%{transform:translateX(-5px)}60%{transform:translateX(4px)}75%{transform:translateX(-2px)}}
      `}</style>

      {/* header — Katagami highlighter on the title */}
      <h1 className="font-display text-2xl font-black tracking-[-0.03em] sm:text-3xl">
        Model{" "}
        <span className="marker">
          <span className="marker-fill" style={{ background: "var(--yuzu)" }} />
          <span className="marker-text">Bake Off</span>
        </span>
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Guess which model made each design.
      </p>

      {/* round switcher — browse every round */}
      {COMPARISONS.length > 1 && (
        <nav className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Rounds
          </span>
          {COMPARISONS.map((r) => {
            const active = r.slug === c.slug;
            return (
              <Link
                key={r.slug}
                href={`/lab/${r.slug}`}
                aria-current={active ? "page" : undefined}
                className={`px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] shadow-[0_1px_0_#1e232d1f] transition-all hover:-translate-y-[1px] ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.tag}
              </Link>
            );
          })}
        </nav>
      )}

      {/* the prompt — hidden by default, compact, code-style */}
      {c.prompt && (
        <div className="mt-5">
          <button
            onClick={() => setShowPrompt((s) => !s)}
            className={`${STICKER} bg-card text-foreground`}
          >
            {showPrompt ? "Hide the prompt" : "See the prompt"}
          </button>
          {showPrompt && (
            <figure className="relative mt-4 max-w-2xl">
              <span
                aria-hidden
                className="block font-display text-5xl font-black leading-none text-[var(--sakura)]"
              >
                &ldquo;
              </span>
              <div className="mt-2 space-y-3 font-mono">
                {c.prompt.split("\n\n").map((section, i) => {
                  const nl = section.indexOf("\n");
                  const head = nl === -1 ? "" : section.slice(0, nl);
                  const body = nl === -1 ? section : section.slice(nl + 1);
                  return (
                    <div key={i}>
                      {head && (
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ramune)]">
                          <span className="text-foreground/30">// </span>
                          {head}
                        </p>
                      )}
                      <p className="mt-1 text-[13px] leading-relaxed text-foreground/75">{body}</p>
                    </div>
                  );
                })}
              </div>
              <span
                aria-hidden
                className="mt-2 block text-right font-display text-5xl font-black leading-none text-[var(--ramune)]"
              >
                &rdquo;
              </span>
            </figure>
          )}
        </div>
      )}

      {/* the anti-slop rulebook — hidden by default, clean styled collapsible */}
      {c.rules && (
        <div className="mt-3">
          <button
            onClick={() => setShowRules((s) => !s)}
            className={`${STICKER} bg-card text-foreground`}
          >
            {showRules ? "Hide the rules" : "See the anti-slop rules"}
          </button>
          {showRules && (
            <div className="mt-4 max-h-[65vh] max-w-2xl space-y-4 overflow-y-auto rounded-[16px] bg-card/60 p-5">
              {c.rules.split("\n\n").map((section, i) => {
                const lines = section.split("\n");
                const head = lines[0];
                const body = lines.slice(1);
                return (
                  <div key={i}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ramune)]">
                      <span className="text-foreground/30">// </span>
                      {head}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {body.map((line, j) => (
                        <li key={j} className="text-[13px] leading-relaxed text-foreground/75">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* "anti-slop" rules on/off (on = round 11 with rules, off = round 12 no rules) */}
      {variantSet && (
        <div className="mt-5">
          <Switch
            on={variantMode === "primary"}
            onToggle={() => switchVariant(variantMode === "primary" ? "variant" : "primary")}
            label={<>&ldquo;anti-slop&rdquo; rules</>}
          />
        </div>
      )}

      {mode === "quiz" && step < total && (
        <QuizQuestion
          key={`${variantMode}-${step}`}
          active={active}
          other={other}
          questions={questions}
          answers={answers}
          index={step}
          view={view}
          setView={setView}
          onPick={(opt, e) => {
            const q = questions[step];
            if (opt === q.name) {
              const r = e.currentTarget.getBoundingClientRect();
              fireConfetti(r.left + r.width / 2, r.top + r.height / 2);
            }
            setAnswers((prev) => ({ ...prev, [q.key]: opt }));
          }}
          onNext={() => setStep((s) => s + 1)}
          onSkip={() => setMode("details")}
        />
      )}

      {mode === "quiz" && step >= total && total > 0 && (
        <ScoreScreen correct={correct} total={total} onDetails={() => setMode("details")} />
      )}

      {mode === "details" && (
        <DetailsGrid
          active={active}
          view={view}
          setView={setView}
          answers={answers}
          correct={correct}
          onReplay={() => {
            setAnswers({});
            setStep(0);
            setMode("quiz");
          }}
        />
      )}
    </div>
  );
}
