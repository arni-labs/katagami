/**
 * Katagami — Curation Flow (minimalistic)
 *
 * Idea → Research → (fan-out) → S1..Sn → O1..On → Gallery.
 * Same minimalistic style as system-diagram: Bricolage / Nunito / Geist
 * Mono, palette-tinted cards with thin top ribbons, STRAIGHT connectors,
 * 24-px readable arrow labels, dot-grid paper. Only two corner washi
 * strips — no per-card tape or sparkles.
 *
 * Render with:
 *   npx poster-ai export posters/curation-flow.tsx -o posters/curation-flow.png
 */

// ── Palette (oklch — matches ui/src/app/globals.css) ─────────────
const C = {
  paper: "oklch(1 0 0)",
  ink: "oklch(0.26 0.015 260)",
  muted: "oklch(0.52 0.012 260)",
  sakura: "oklch(0.82 0.15 12)",
  yuzu: "oklch(0.93 0.17 98)",
  salad: "oklch(0.88 0.2 135)",
  matcha: "oklch(0.78 0.16 155)",
  teal: "oklch(0.8 0.13 200)",
  ramune: "oklch(0.78 0.16 235)",
  sumire: "oklch(0.75 0.16 300)",
  beni: "oklch(0.65 0.2 25)",
} as const;

const FONT_DISPLAY =
  '"Bricolage Grotesque", "Nunito", ui-sans-serif, system-ui, sans-serif';
const FONT_SANS =
  '"Nunito", ui-sans-serif, system-ui, -apple-system, sans-serif';
const FONT_MONO =
  '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const SHADOW_PAPER =
  "0 1px 2px rgba(30,35,45,0.04), 0 6px 18px rgba(30,35,45,0.06)";

const T = {
  eyebrow: 14,
  body: 19,
  chip: 18,
  titleBig: 44,
  titleMed: 28,
  label: 24,
} as const;

const EYEBROW_COLOR = "oklch(0.38 0.018 260)";

// ── Atoms ─────────────────────────────────────────────────────────

function FontsAndVars() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;700&display=swap');
    `}</style>
  );
}

function WashiTape({
  x,
  y,
  w,
  h,
  rotate = 0,
  color,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  color: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `rotate(${rotate}deg)`,
        background: `repeating-linear-gradient(45deg, color-mix(in oklch, ${color} 75%, white) 0 7px, color-mix(in oklch, ${color} 40%, white) 7px 14px)`,
        opacity: 0.85,
        borderRadius: 1,
        boxShadow: "0 1px 2px rgba(30,35,45,0.05)",
      }}
    />
  );
}

function Stamp({
  children,
  color = C.sumire,
  rotate = 0,
  size = T.label,
}: {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  size?: number;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: `1.6px solid ${color}`,
        borderRadius: 3,
        padding: "5px 12px",
        fontFamily: FONT_MONO,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
        background: `color-mix(in oklch, ${color} 10%, white)`,
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        whiteSpace: "nowrap",
        lineHeight: 1.05,
      }}
    >
      {children}
    </span>
  );
}

function Card({
  x,
  y,
  w,
  h,
  tint,
  showRibbon = true,
  padding = "24px 28px",
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tint: string;
  showRibbon?: boolean;
  padding?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: `color-mix(in srgb, ${tint} 12%, rgba(255,255,255,0.92))`,
        boxShadow: SHADOW_PAPER,
        overflow: "visible",
        boxSizing: "border-box",
        color: C.ink,
      }}
    >
      {showRibbon && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 4,
            background: tint,
          }}
        />
      )}
      <div
        style={{
          padding,
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Straight vertical connector with optional stamp label to the right.
function VArrow({
  x,
  y1,
  y2,
  color = C.ink,
  label,
  labelColor,
  labelOffsetX = 22,
  withArrowhead = true,
}: {
  x: number;
  y1: number;
  y2: number;
  color?: string;
  label?: string;
  labelColor?: string;
  labelOffsetX?: number;
  withArrowhead?: boolean;
}) {
  const h = y2 - y1;
  return (
    <>
      <svg
        style={{
          position: "absolute",
          left: x - 10,
          top: y1,
          width: 20,
          height: h,
          overflow: "visible",
        }}
      >
        <line
          x1="10"
          y1="0"
          x2="10"
          y2={withArrowhead ? h - 9 : h}
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {withArrowhead && (
          <polyline
            points={`4,${h - 9} 10,${h - 1} 16,${h - 9}`}
            fill="none"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {label && (
        <div
          style={{
            position: "absolute",
            left: x + labelOffsetX,
            top: y1 + h / 2 - 17,
          }}
        >
          <Stamp color={labelColor ?? color}>{label}</Stamp>
        </div>
      )}
    </>
  );
}

// Straight fan-out: one source, many targets. Central stem + horizontal
// bus + one vertical drop per target (with arrowhead).
function FanOut({
  source,
  targets,
  color = C.beni,
  stemH = 22,
}: {
  source: { x: number; y: number };
  targets: { x: number; y: number }[];
  color?: string;
  stemH?: number;
}) {
  const minX = Math.min(source.x, ...targets.map((t) => t.x));
  const maxX = Math.max(source.x, ...targets.map((t) => t.x));
  const minY = source.y;
  const maxY = Math.max(...targets.map((t) => t.y));
  const pad = 20;
  const bx = minX - pad;
  const by = minY;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad;
  const sx = source.x - bx;
  const sy = source.y - by;
  const busY = sy + stemH;
  return (
    <svg
      style={{
        position: "absolute",
        left: bx,
        top: by,
        width: w,
        height: h,
        overflow: "visible",
      }}
    >
      {/* central stem */}
      <line
        x1={sx}
        y1={sy}
        x2={sx}
        y2={busY}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* horizontal bus across all targets */}
      <line
        x1={targets[0].x - bx}
        y1={busY}
        x2={targets[targets.length - 1].x - bx}
        y2={busY}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* drop to each target with arrowhead */}
      {targets.map((t, i) => {
        const tx = t.x - bx;
        const ty = t.y - by;
        return (
          <g key={i}>
            <line
              x1={tx}
              y1={busY}
              x2={tx}
              y2={ty - 9}
              stroke={color}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <polyline
              points={`${tx - 6},${ty - 9} ${tx},${ty - 1} ${tx + 6},${ty - 9}`}
              fill="none"
              stroke={color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

// Mirror of FanOut: many sources converge to a single target.
function FanIn({
  sources,
  target,
  color = C.salad,
  stemH = 22,
}: {
  sources: { x: number; y: number }[];
  target: { x: number; y: number };
  color?: string;
  stemH?: number;
}) {
  const minX = Math.min(target.x, ...sources.map((s) => s.x));
  const maxX = Math.max(target.x, ...sources.map((s) => s.x));
  const minY = Math.min(...sources.map((s) => s.y));
  const maxY = target.y;
  const pad = 20;
  const bx = minX - pad;
  const by = minY;
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad;
  const tx = target.x - bx;
  const ty = target.y - by;
  const busY = ty - stemH;
  return (
    <svg
      style={{
        position: "absolute",
        left: bx,
        top: by,
        width: w,
        height: h,
        overflow: "visible",
      }}
    >
      {/* vertical drops from each source down to the bus */}
      {sources.map((s, i) => {
        const sx = s.x - bx;
        const sy = s.y - by;
        return (
          <line
            key={i}
            x1={sx}
            y1={sy}
            x2={sx}
            y2={busY}
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        );
      })}
      {/* horizontal bus */}
      <line
        x1={sources[0].x - bx}
        y1={busY}
        x2={sources[sources.length - 1].x - bx}
        y2={busY}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* central stem from bus to target, with arrowhead */}
      <line
        x1={tx}
        y1={busY}
        x2={tx}
        y2={ty - 9}
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <polyline
        points={`${tx - 6},${ty - 9} ${tx},${ty - 1} ${tx + 6},${ty - 9}`}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Small square card for S / O nodes in the fan-out rows.
function LetterCard({
  x,
  y,
  letter,
  num,
  tint,
}: {
  x: number;
  y: number;
  letter: string;
  num: string;
  tint: string;
}) {
  return (
    <Card x={x} y={y} w={110} h={120} tint={tint} padding="10px">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          paddingTop: 4,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 48,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: C.ink,
            lineHeight: 1,
          }}
        >
          {letter}
        </div>
        <div
          style={{
            fontFamily: FONT_MONO,
            fontSize: 18,
            fontWeight: 700,
            color: EYEBROW_COLOR,
            marginTop: 8,
            letterSpacing: "0.06em",
          }}
        >
          {num}
        </div>
      </div>
    </Card>
  );
}

// ── Poster ────────────────────────────────────────────────────────
export default function CurationFlowPoster() {
  const eyebrow: React.CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: T.eyebrow,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: EYEBROW_COLOR,
    fontWeight: 700,
  };
  const title: React.CSSProperties = {
    fontFamily: FONT_DISPLAY,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: C.ink,
    fontFeatureSettings: '"ss02", "ss04"',
  };

  const bulletRow = (
    label: string,
    glyph: React.ReactNode,
    key: string,
  ) => (
    <div
      key={key}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: FONT_SANS,
        fontSize: T.body,
        color: C.ink,
        fontWeight: 600,
      }}
    >
      {glyph}
      {label}
    </div>
  );

  // x-centers for the 3 fan-out columns
  const C1 = 515;
  const C2 = 675;
  const C3 = 835;

  return (
    <div
      className="w-[1350px] h-[1560px]"
      style={{
        position: "relative",
        background: C.paper,
        backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.65 0.008 260 / 0.08) 1px, transparent 0)`,
        backgroundSize: "24px 24px",
        color: C.ink,
        overflow: "hidden",
        fontFamily: FONT_SANS,
      }}
    >
      <FontsAndVars />

      {/* Canvas-corner washi tapes */}
      <WashiTape x={-20} y={40} w={180} h={22} rotate={-6} color={C.sakura} />
      <WashiTape
        x={1200}
        y={1510}
        w={180}
        h={22}
        rotate={-5}
        color={C.yuzu}
      />

      {/* ─────── IDEA ─────── */}
      <Card x={475} y={60} w={400} h={140} tint={C.yuzu}>
        <div style={eyebrow}>idea</div>
        <div
          style={{
            ...title,
            fontSize: 26,
            fontWeight: 700,
            fontStyle: "italic",
            marginTop: 14,
            lineHeight: 1.22,
          }}
        >
          &ldquo;sci-fi meets editorial&rdquo;
        </div>
      </Card>

      {/* kick off ↓ */}
      <VArrow
        x={675}
        y1={210}
        y2={285}
        color={C.sumire}
        label="kick off"
        labelColor={C.sumire}
      />

      {/* ─────── RESEARCH ─────── */}
      <Card x={445} y={295} w={460} h={260} tint={C.matcha}>
        <div style={eyebrow}>agent session</div>
        <div style={{ ...title, fontSize: 40, marginTop: 4 }}>Research</div>
        <div
          style={{
            marginTop: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {[
            ["scans the web", C.teal],
            ["reads style guides", C.ramune],
            ["finds N directions", C.sumire],
          ].map(([t, col]) => (
            <div
              key={t as string}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: FONT_SANS,
                fontSize: T.body - 1,
                fontWeight: 600,
                color: C.ink,
              }}
            >
              <span
                style={{
                  color: col as string,
                  fontWeight: 800,
                  fontSize: T.body,
                }}
              >
                ▸
              </span>
              {t}
            </div>
          ))}
        </div>
      </Card>

      {/* auto-fans-out ↓ (central stem) */}
      <VArrow
        x={675}
        y1={565}
        y2={635}
        color={C.beni}
        label="auto-fans-out"
        labelColor={C.beni}
      />

      {/* Fan-out: 3 parallel arrows land on the top of Synthesize at
          x=C1/C2/C3, showing the N-concurrent nature. */}
      <FanOut
        source={{ x: 675, y: 638 }}
        targets={[
          { x: C1, y: 700 },
          { x: C2, y: 700 },
          { x: C3, y: 700 },
        ]}
        color={C.beni}
        stemH={12}
      />

      {/* ─────── SYNTHESIZE ─────── */}
      <Card x={445} y={705} w={460} h={200} tint={C.salad}>
        <div style={eyebrow}>agent sessions · N parallel</div>
        <div style={{ ...title, fontSize: 40, marginTop: 4 }}>Synthesize</div>
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT_SANS,
            fontSize: T.body - 1,
            color: C.ink,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          One session per direction. Each writes a full spec and embodiment in its own sandbox.
        </div>
      </Card>

      {/* 3 parallel arrows between Synthesize and Organize */}
      <VArrow x={C1} y1={910} y2={975} color={C.ramune} />
      <VArrow x={C2} y1={910} y2={975} color={C.teal} />
      <VArrow x={C3} y1={910} y2={975} color={C.sumire} />

      {/* ─────── ORGANIZE ─────── */}
      <Card x={445} y={985} w={460} h={200} tint={C.sumire}>
        <div style={eyebrow}>auto-spawned on completion</div>
        <div style={{ ...title, fontSize: 40, marginTop: 4 }}>Organize</div>
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT_SANS,
            fontSize: T.body - 1,
            color: C.ink,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          Each Synthesize finish spawns its own Organize job — taxonomy, tags, tokens.
        </div>
      </Card>

      {/* Fan-in: 3 sources at Organize bottom converge to Gallery top.
          Larger stemH pushes the horizontal bus further away from Gallery. */}
      <FanIn
        sources={[
          { x: C1, y: 1195 },
          { x: C2, y: 1195 },
          { x: C3, y: 1195 },
        ]}
        target={{ x: 675, y: 1320 }}
        color={C.matcha}
        stemH={50}
      />

      {/* ─────── GALLERY ─────── */}
      <Card x={445} y={1325} w={460} h={200} tint={C.sakura}>
        <div style={eyebrow}>published</div>
        <div style={{ ...title, fontSize: 40, marginTop: 4 }}>Gallery</div>
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT_SANS,
            fontSize: T.body - 1,
            color: C.ink,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          N new languages — published, browsable, embodied.
        </div>
      </Card>
    </div>
  );
}
