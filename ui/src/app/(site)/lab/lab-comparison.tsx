"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScaledFrame } from "@/components/scaled-frame";
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

// resolve a model's iframe src in a surface set + view; null if it has no design here.
// Backend rounds carry real file URLs in `previews`; legacy static rounds fall back
// to the /lab/<slug>/<dir>/<view>.html artifact path.
function resolvePreview(set: SurfaceSet | null, key: string, view: LabView) {
  if (!set || !set.models[key]) return null;
  const m = set.models[key];
  const avail = m.views ?? set.views;
  if (!avail.length) return null;
  const vw = avail.includes(view) ? view : avail[0];
  const url = m.previews?.[vw] ?? `/lab/${set.slug}/${m.dir}/${vw}.html`;
  return { set, m, view: vw, url };
}

// the "Open in new tab" / details link target for a model's view
function viewUrl(m: LabModel, slug: string, view: LabView): string {
  return m.previews?.[view] ?? `/lab/${slug}/${m.dir}/${view}.html`;
}

// Compositions are authored at the desktop breakpoint and are full live pages
// (100vh heroes, entrance animations). Each is rendered through the shared
// ScaledFrame — the same path the detail-page viewer uses: it injects a safety
// stylesheet (freeze animations, cap runaway 100vh), measures the real content
// height a few times as fonts/images settle, and scales the desktop layout to fit
// the column. So a preview reads as a small STATIC desktop you scroll — not a
// live, half-measured image you pan around.
function PreviewFrame({
  src,
  title,
  thumb,
  openHref,
  scrollable = false,
  className,
}: {
  src: string;
  title: string;
  thumb?: string;
  openHref?: string;
  scrollable?: boolean;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Lazy-mount: a round has a dozen models, so only fetch/render a composition
  // once its card nears the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Phones get a static screenshot when one exists — cheaper than rendering the
  // composition; the "Open" link below shows the full result.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const isMobile = !desktop;
  const useThumb = isMobile && Boolean(thumb);

  // Fetch the self-contained composition once in view (unless a phone thumbnail
  // covers it) and hand the HTML to ScaledFrame.
  useEffect(() => {
    if (!visible || useThumb || html || failed || !src) return;
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => {
        if (!cancelled) setHtml(t);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, useThumb, html, failed, src]);

  // Mobile is a fixed 16:10 card; desktop honors the caller's height and (when
  // scrollable) scrolls the full static page.
  const frameClass = isMobile
    ? "aspect-[16/10] w-full overflow-hidden"
    : `${scrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"} ${className}`;

  return (
    <div ref={ref} className={`sticker-card relative ${frameClass}`}>
      {useThumb ? (
        <a
          href={openHref ?? src}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0 block"
        >
          {/* Static screenshot — the live composition is reserved for desktop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt={title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <span className="absolute bottom-2 right-2 bg-foreground/85 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-background">
            open ↗
          </span>
        </a>
      ) : failed ? (
        <div className="absolute inset-0 grid place-items-center bg-card px-6 text-center">
          <p className="font-mono text-[11px] text-muted-foreground">
            preview unavailable
          </p>
        </div>
      ) : html ? (
        <ScaledFrame html={html} title={title} />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
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
  if (!m.harness && !m.imageModel && !m.tokensThinking) return null;
  return (
    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
      {[
        m.harness && `Harness: ${m.harness}`,
        m.imageModel && `Image: ${m.imageModel}`,
        m.tokensThinking && `${m.tokensThinking} thinking tok`,
      ]
        .filter(Boolean)
        .join(" · ")}
    </p>
  );
}

// A Katagami status rubber-stamp — the site's own .stamp (rotated, grain-inked).
const STATUS_LABEL: Record<string, string> = {
  Draft: "Draft",
  UnderReview: "Under review",
  Published: "Published",
  Archived: "Archived",
};
function StatusStamp({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const tone = status === "Archived" ? "var(--beni)" : "var(--sakura)";
  return (
    <span className="stamp" style={{ color: tone }}>
      {label}
    </span>
  );
}

// The submitted Katagami language behind a design: its name + review stamp. The
// model is what you GUESS; this is what the model actually MADE.
function LanguageLine({ m, center }: { m: LabModel; center?: boolean }) {
  if (!m.languageName) return null;
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5 ${center ? "justify-center" : ""}`}
    >
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        made
      </span>
      <span className="font-display text-[17px] font-bold tracking-[-0.02em] text-foreground">
        {m.languageName}
      </span>
      {m.status && m.status !== "Published" && <StatusStamp status={m.status} />}
    </div>
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
          Skip the quiz
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
            src={pr.url}
            title={`Design ${index + 1}`}
            thumb={m.thumb}
            openHref={pr.url}
            scrollable
            className="h-[60vh] min-h-[360px] w-full"
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
          <div className="mt-2">
            <LanguageLine m={m} center />
          </div>
          <button onClick={onNext} className={`${STICKER} mt-5 bg-foreground text-background`}>
            {index + 1 < total ? "Next design" : "See your score"}
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
        See all designs &amp; details
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
  const [sort, setSort] = useState<"default" | "price-desc" | "price-asc">(
    "default",
  );
  const anyCost = order.some((k) => parseCost(active.models[k]?.cost) != null);
  const displayOrder =
    sort === "default"
      ? order
      : [...order].sort((a, b) => {
          const ca = parseCost(active.models[a]?.cost);
          const cb = parseCost(active.models[b]?.cost);
          if (ca == null && cb == null) return 0;
          if (ca == null) return 1; // models without a cost sort last
          if (cb == null) return -1;
          return sort === "price-desc" ? cb - ca : ca - cb;
        });

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

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          All {n} designs
        </span>
        {anyCost && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Sort
            </span>
            <Segmented
              options={[
                { key: "default", label: "Default" },
                { key: "price-desc", label: "Price ↓" },
                { key: "price-asc", label: "Price ↑" },
              ]}
              value={sort}
              onChange={(k) =>
                setSort(k as "default" | "price-desc" | "price-asc")
              }
            />
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        {displayOrder.map((key) => {
          const i = order.indexOf(key);
          const m = active.models[key];
          const label = LABELS[i] ?? String(i + 1);
          const previewSrc = viewUrl(m, active.slug, view);
          const hasView = (m.views ?? active.views).includes(view);
          const guessed = answers[key];
          return (
            <div
              key={key}
              className="flex flex-col gap-3"
              style={{ animation: "quiz-in 360ms cubic-bezier(.2,.9,.3,1) both" }}
            >
              {/* model — the reveal answer */}
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-foreground font-display text-[15px] font-bold text-background">
                  {label}
                </span>
                <span className="font-display text-[20px] font-bold leading-none tracking-[-0.02em]">
                  {m.name}
                </span>
              </div>

              {/* the design */}
              {hasView ? (
                <PreviewFrame
                  src={previewSrc}
                  title={`Model ${label} — ${view}`}
                  thumb={m.thumb}
                  openHref={previewSrc}
                  scrollable
                  className="h-[440px]"
                />
              ) : (
                <div className="sticker-card relative aspect-[16/10] overflow-hidden">
                  <div className="absolute inset-0 grid place-items-center bg-card px-6 text-center">
                    <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                      {m.note ?? `No ${VIEW_LABEL[view].toLowerCase()} — this model didn’t produce one.`}
                    </p>
                  </div>
                </div>
              )}

              {/* what it made + your guess */}
              <LanguageLine m={m} />
              {guessed &&
                (guessed === m.name ? (
                  <p className="text-[13px] font-bold">
                    <span className="marker">
                      <span className="marker-fill" style={{ background: "var(--yuzu)" }} />
                      <span className="marker-text">You guessed it</span>
                    </span>
                  </p>
                ) : (
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    You guessed {guessed}
                  </p>
                ))}

              {/* what it cost — cost is the headline, tokens line up with it */}
              {(m.cost || m.tokens || m.wall) && (
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2 pt-0.5">
                  {(
                    [
                      ["cost", m.cost],
                      ["total tokens", m.tokens],
                      ["time", m.wall],
                    ] as [string, string | undefined][]
                  )
                    .filter(([, v]) => v)
                    .map(([lbl, v]) => (
                      <span key={lbl} className="inline-flex flex-col">
                        <span className="font-display text-[19px] font-black leading-none tracking-[-0.02em] tabular-nums text-foreground">
                          {v}
                        </span>
                        <span className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          {lbl}
                        </span>
                      </span>
                    ))}
                </div>
              )}
              <MetaLine m={m} />

              {/* links */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                {hasView && (
                  <a
                    href={previewSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="ink-underline text-foreground"
                  >
                    Open {view}
                  </a>
                )}
                {m.languageId && (
                  <a
                    href={`/language/${m.languageId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ink-underline text-[var(--ramune)]"
                  >
                    View language
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
      <Link
        href="/model-bake-off"
        className="ink-underline inline-block font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
      >
        All rounds
      </Link>
      <h1 className="mt-3 font-display text-3xl font-black tracking-[-0.03em] sm:text-4xl">
        {c.title ? (
          <>
            <span className="marker">
              <span className="marker-fill" style={{ background: "var(--yuzu)" }} />
              <span className="marker-text">{c.title}</span>
            </span>
          </>
        ) : (
          <>
            Model{" "}
            <span className="marker">
              <span className="marker-fill" style={{ background: "var(--yuzu)" }} />
              <span className="marker-text">Bake Off</span>
            </span>
          </>
        )}
      </h1>
      {/* based on — the existing published language, shown full-frame + linked */}
      {c.sourceName && (
        <a
          href={c.sourceId ? `/language/${c.sourceId}` : undefined}
          target="_blank"
          rel="noreferrer"
          className="group mt-5 inline-flex items-center gap-4"
        >
          <span
            className="relative block w-44 shrink-0 overflow-hidden shadow-[var(--shadow-card)] transition-transform group-hover:-translate-y-[2px]"
            style={{ aspectRatio: "16 / 10" }}
          >
            <span aria-hidden className="absolute inset-x-0 top-0 z-10 flex h-[3px]">
              <span className="h-full flex-1" style={{ background: "var(--sakura)" }} />
              <span className="h-full flex-1" style={{ background: "var(--yuzu)" }} />
              <span className="h-full flex-1" style={{ background: "var(--ramune)" }} />
            </span>
            {c.sourceThumb ? (
              <span
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${c.sourceThumb})` }}
              />
            ) : (
              <span className="absolute inset-0 bg-muted" />
            )}
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Based on the existing language
            </span>
            <span className="font-display text-[20px] font-bold leading-tight tracking-[-0.02em] text-foreground">
              {c.sourceName}
            </span>
            <span className="ink-underline inline-block w-fit font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ramune)]">
              View language
            </span>
          </span>
        </a>
      )}

      {/* the brief every model was given — pulled verbatim from the Direction */}
      {c.prompt && (
        <figure className="mt-6 max-w-2xl">
          <figcaption className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            The brief
          </figcaption>
          <div className="mt-2 space-y-3">
            {c.prompt
              .trim()
              .split(/\n{2,}/)
              .map((para, i) => (
                <p
                  key={i}
                  className="whitespace-pre-line text-[16px] leading-relaxed text-foreground/80"
                >
                  {para.trim()}
                </p>
              ))}
          </div>
        </figure>
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
        <p className="mt-8 text-[17px] leading-relaxed text-muted-foreground">
          Guess which model made each design.
        </p>
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
