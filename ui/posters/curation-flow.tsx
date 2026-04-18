/**
 * Katagami — Curation Flow (scrapbook, diagram-only)
 *
 * Idea → Research → (fan-out) → S1..Sn → O1..On → Gallery.
 * Front-page style: Bricolage / Nunito / Geist Mono, translucent sticker
 * cards (no borders) with palette tints + top ribbons, washi tape corners,
 * colorful squiggly arrows, stamps, dot-grid paper.
 *
 * Render with:
 *   npx poster-ai export posters/curation-flow.tsx -o posters/curation-flow.png
 */

// ── Palette ───────────────────────────────────────────────────────
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
  rotate = -2,
  size = 10,
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
        border: `1.5px solid ${color}`,
        borderRadius: 3,
        padding: "2px 9px",
        fontFamily: FONT_MONO,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        background: `color-mix(in oklch, ${color} 10%, white)`,
        transform: `rotate(${rotate}deg)`,
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function Sparkle({
  x,
  y,
  size = 12,
  color = C.sumire,
  rotate = 0,
  opacity = 0.6,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  rotate?: number;
  opacity?: number;
}) {
  return (
    <svg
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
        color,
        opacity,
      }}
      viewBox="0 0 12 12"
      fill="currentColor"
    >
      <path d="M6 0.5 L7 4.9 L11.5 6 L7 7.1 L6 11.5 L5 7.1 L0.5 6 L5 4.9 Z" />
    </svg>
  );
}

function Card({
  x,
  y,
  w,
  h,
  tint,
  rotate = 0,
  tape,
  tapeRot = -4,
  tapePos = "tl" as "tl" | "tr",
  showRibbon = true,
  padding = "20px 22px",
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tint: string;
  rotate?: number;
  tape?: string;
  tapeRot?: number;
  tapePos?: "tl" | "tr";
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
        transform: `rotate(${rotate}deg)`,
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
      {tape && (
        <WashiTape
          x={tapePos === "tl" ? -10 : w - 80}
          y={-8}
          w={90}
          h={16}
          rotate={tapeRot}
          color={tape}
        />
      )}
      <div style={{ padding, height: "100%", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

function VArrow({
  x,
  y1,
  y2,
  color = C.ink,
  amp = 10,
  label,
  labelColor,
  labelOffsetX = 16,
}: {
  x: number;
  y1: number;
  y2: number;
  color?: string;
  amp?: number;
  label?: string;
  labelColor?: string;
  labelOffsetX?: number;
}) {
  const h = y2 - y1;
  const cx = 20;
  const d = `M ${cx} 2 Q ${cx + amp} ${h * 0.18} ${cx} ${h * 0.33} T ${cx} ${
    h * 0.66
  } T ${cx} ${h - 10}`;
  return (
    <>
      <svg
        style={{
          position: "absolute",
          left: x - cx,
          top: y1,
          width: 40,
          height: h,
          overflow: "visible",
        }}
      >
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - 6} ${h - 10} L ${cx} ${h - 1} L ${cx + 6} ${h - 10}`}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <div
          style={{
            position: "absolute",
            left: x + labelOffsetX,
            top: y1 + h / 2 - 10,
          }}
        >
          <Stamp color={labelColor ?? color} rotate={-3}>
            {label}
          </Stamp>
        </div>
      )}
    </>
  );
}

// Branching arrow from a single source point down to N target points.
// Renders a tiny central stem, then squiggly branches out to each target.
function FanOut({
  source,
  targets,
  color = C.beni,
  stemH = 18,
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
      <path
        d={`M ${sx} ${sy} L ${sx} ${sy + stemH}`}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {targets.map((t, i) => {
        const tx = t.x - bx;
        const ty = t.y - by;
        const midY = sy + stemH + (ty - sy - stemH) * 0.5;
        // squiggly quadratic through a control point to the side
        const goesLeft = tx < sx;
        const ctrl1X = sx + (tx - sx) * 0.35 + (goesLeft ? -8 : 8);
        const ctrl1Y = midY - 6;
        const ctrl2X = sx + (tx - sx) * 0.75 + (goesLeft ? 8 : -8);
        const ctrl2Y = midY + 6;
        return (
          <g key={i}>
            <path
              d={`M ${sx} ${sy + stemH} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${tx} ${ty - 10}`}
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d={`M ${tx - 6} ${ty - 10} L ${tx} ${ty - 1} L ${tx + 6} ${ty - 10}`}
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

// Converging arrows — mirror of FanOut: many sources → one target.
function FanIn({
  sources,
  target,
  color = C.salad,
  stemH = 18,
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
      {sources.map((s, i) => {
        const sx = s.x - bx;
        const sy = s.y - by;
        const midY = sy + (ty - stemH - sy) * 0.5;
        const goesLeft = tx < sx;
        const ctrl1X = sx + (tx - sx) * 0.25 + (goesLeft ? -8 : 8);
        const ctrl1Y = midY - 6;
        const ctrl2X = sx + (tx - sx) * 0.65 + (goesLeft ? 8 : -8);
        const ctrl2Y = midY + 6;
        return (
          <path
            key={i}
            d={`M ${sx} ${sy} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${tx} ${ty - stemH}`}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        );
      })}
      {/* central stem converging to target */}
      <path
        d={`M ${tx} ${ty - stemH} L ${tx} ${ty - 1}`}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d={`M ${tx - 6} ${ty - 10} L ${tx} ${ty - 1} L ${tx + 6} ${ty - 10}`}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
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
  tape,
  tapeRot = -6,
  rotate = 0,
}: {
  x: number;
  y: number;
  letter: string;
  num: string;
  tint: string;
  tape: string;
  tapeRot?: number;
  rotate?: number;
}) {
  return (
    <Card
      x={x}
      y={y}
      w={100}
      h={110}
      tint={tint}
      tape={tape}
      tapeRot={tapeRot}
      rotate={rotate}
      padding="8px"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          paddingTop: 6,
        }}
      >
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 44,
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
            fontSize: 16,
            fontWeight: 700,
            color: C.muted,
            marginTop: 6,
            letterSpacing: "0.05em",
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
    fontSize: 10,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: C.muted,
  };
  const title: React.CSSProperties = {
    fontFamily: FONT_DISPLAY,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: C.ink,
    fontFeatureSettings: '"ss02", "ss04"',
  };

  // x-centers for the 3 fan-out columns
  const C1 = 515;
  const C2 = 675;
  const C3 = 835;

  return (
    <div
      className="w-[1350px] h-[1320px]"
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

      {/* ─────── IDEA ─────── */}
      <Card
        x={495}
        y={60}
        w={360}
        h={130}
        tint={C.yuzu}
        rotate={-1.2}
        tape={C.sakura}
        tapeRot={-6}
        tapePos="tl"
      >
        <div style={eyebrow}>idea</div>
        <div
          style={{
            ...title,
            fontSize: 24,
            fontWeight: 700,
            fontStyle: "italic",
            marginTop: 10,
            lineHeight: 1.2,
          }}
        >
          &ldquo;sci-fi meets
          <br />
          editorial&rdquo;
        </div>
      </Card>

      {/* kick off ↓ */}
      <VArrow
        x={675}
        y1={198}
        y2={270}
        color={C.sumire}
        label="kick off"
        labelColor={C.sumire}
      />

      {/* ─────── RESEARCH ─────── */}
      <Card
        x={445}
        y={280}
        w={460}
        h={185}
        tint={C.matcha}
        rotate={0.6}
        tape={C.ramune}
        tapeRot={6}
        tapePos="tr"
      >
        <div style={eyebrow}>agent session</div>
        <div style={{ ...title, fontSize: 36, marginTop: 2 }}>Research</div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontFamily: FONT_MONO,
            fontSize: 13,
            color: C.ink,
          }}
        >
          {[
            ["scans the web", C.teal],
            ["reads articles & style guides", C.ramune],
            ["identifies N promising directions", C.sumire],
          ].map(([t, col]) => (
            <div
              key={t as string}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ color: col as string, fontWeight: 800 }}>▸</span>
              {t}
            </div>
          ))}
        </div>
      </Card>

      {/* auto-fans-out ↓ */}
      <VArrow
        x={675}
        y1={475}
        y2={560}
        color={C.beni}
        label="auto-fans-out"
        labelColor={C.beni}
      />

      {/* fan-out branches into S1 S2 S3 */}
      <FanOut
        source={{ x: 675, y: 563 }}
        targets={[
          { x: C1, y: 615 },
          { x: C2, y: 615 },
          { x: C3, y: 615 },
        ]}
        color={C.beni}
        stemH={12}
      />

      {/* ─────── S row ─────── */}
      <LetterCard
        x={C1 - 50}
        y={620}
        letter="S"
        num="1"
        tint={C.salad}
        tape={C.sumire}
        tapeRot={-8}
        rotate={-1.5}
      />
      <LetterCard
        x={C2 - 50}
        y={620}
        letter="S"
        num="2"
        tint={C.salad}
        tape={C.yuzu}
        tapeRot={4}
        rotate={0.6}
      />
      <LetterCard
        x={C3 - 50}
        y={620}
        letter="S"
        num="3"
        tint={C.salad}
        tape={C.teal}
        tapeRot={-5}
        rotate={1.8}
      />
      {/* … ellipsis for N more — sits on the left of S1 to pair with the
          Synthesize note now living in the left margin. */}
      <div
        style={{
          position: "absolute",
          left: C1 - 96,
          top: 660,
          fontFamily: FONT_MONO,
          fontSize: 24,
          fontWeight: 800,
          color: C.muted,
          letterSpacing: "0.05em",
        }}
      >
        …
      </div>

      {/* Left margin note for S row — balances the O note on the right */}
      <Card
        x={70}
        y={610}
        w={295}
        h={130}
        tint={C.sakura}
        rotate={-1.8}
        tape={C.yuzu}
        tapeRot={6}
        tapePos="tr"
      >
        <div style={eyebrow}>✎ synthesize</div>
        <div
          style={{
            ...title,
            fontSize: 15,
            fontWeight: 700,
            marginTop: 8,
            lineHeight: 1.3,
          }}
        >
          One session per direction.
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT_MONO,
            fontSize: 11.5,
            lineHeight: 1.45,
            color: C.ink,
          }}
        >
          Each writes a full spec + embodiment in its own Modal sandbox.
        </div>
      </Card>

      {/* S → O arrows (three parallel verticals) */}
      <VArrow
        x={C1}
        y1={735}
        y2={810}
        color={C.ramune}
        amp={7}
      />
      <VArrow
        x={C2}
        y1={735}
        y2={810}
        color={C.teal}
        amp={7}
      />
      <VArrow
        x={C3}
        y1={735}
        y2={810}
        color={C.sumire}
        amp={7}
      />

      {/* ─────── O row ─────── */}
      <LetterCard
        x={C1 - 50}
        y={815}
        letter="O"
        num="1"
        tint={C.sumire}
        tape={C.sakura}
        tapeRot={-7}
        rotate={1.4}
      />
      <LetterCard
        x={C2 - 50}
        y={815}
        letter="O"
        num="2"
        tint={C.sumire}
        tape={C.teal}
        tapeRot={5}
        rotate={-0.8}
      />
      <LetterCard
        x={C3 - 50}
        y={815}
        letter="O"
        num="3"
        tint={C.sumire}
        tape={C.yuzu}
        tapeRot={-4}
        rotate={1.2}
      />
      <div
        style={{
          position: "absolute",
          left: C3 + 72,
          top: 855,
          fontFamily: FONT_MONO,
          fontSize: 24,
          fontWeight: 800,
          color: C.muted,
          letterSpacing: "0.05em",
        }}
      >
        …
      </div>

      {/* Right margin note for O row */}
      <Card
        x={985}
        y={805}
        w={295}
        h={130}
        tint={C.teal}
        rotate={2}
        tape={C.matcha}
        tapeRot={-6}
        tapePos="tl"
      >
        <div style={eyebrow}>✦ organize</div>
        <div
          style={{
            ...title,
            fontSize: 15,
            fontWeight: 700,
            marginTop: 8,
            lineHeight: 1.3,
          }}
        >
          Each completion auto-spawns.
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT_MONO,
            fontSize: 11.5,
            lineHeight: 1.45,
            color: C.ink,
          }}
        >
          A Synthesize finish triggers its own Organize job — taxonomy, tags,
          tokens.
        </div>
      </Card>

      {/* converge → Gallery */}
      <FanIn
        sources={[
          { x: C1, y: 930 },
          { x: C2, y: 930 },
          { x: C3, y: 930 },
        ]}
        target={{ x: 675, y: 1020 }}
        color={C.salad}
        stemH={16}
      />

      {/* ─────── GALLERY ─────── */}
      <Card
        x={445}
        y={1025}
        w={460}
        h={160}
        tint={C.sakura}
        rotate={-0.4}
        tape={C.yuzu}
        tapeRot={-5}
        tapePos="tl"
      >
        <div style={eyebrow}>published</div>
        <div style={{ ...title, fontSize: 40, marginTop: 0 }}>Gallery</div>
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT_MONO,
            fontSize: 13,
            color: C.ink,
          }}
        >
          N new languages — published, browsable, embodied.
        </div>
        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Stamp color={C.matcha}>live</Stamp>
          <Stamp color={C.sumire} rotate={2}>
            browsable
          </Stamp>
          <Stamp color={C.teal} rotate={-3}>
            embodied
          </Stamp>
        </div>
      </Card>

      {/* ─────── LEGEND ─────── */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1215,
          display: "flex",
          justifyContent: "center",
          gap: 40,
          fontFamily: FONT_MONO,
          fontSize: 12,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.muted,
          fontWeight: 700,
        }}
      >
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              background: C.salad,
              boxShadow: "0 1px 0 rgba(30,35,45,0.08)",
            }}
          />
          S = Synthesize
        </span>
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              background: C.sumire,
              boxShadow: "0 1px 0 rgba(30,35,45,0.08)",
            }}
          />
          O = Organize
        </span>
      </div>

      {/* Scrapbook flourishes */}
      <Sparkle x={60} y={80} size={13} color={C.sumire} rotate={-15} />
      <Sparkle x={1280} y={110} size={15} color={C.teal} rotate={10} />
      <Sparkle x={55} y={540} size={11} color={C.beni} rotate={22} />
      <Sparkle x={1290} y={570} size={12} color={C.matcha} rotate={-10} />
      <Sparkle x={55} y={850} size={10} color={C.yuzu} rotate={14} />
      <Sparkle x={1295} y={960} size={13} color={C.sakura} rotate={-12} />
      <Sparkle x={260} y={1175} size={12} color={C.ramune} rotate={8} />
      <Sparkle x={1100} y={1175} size={11} color={C.salad} rotate={-8} />

      <WashiTape
        x={60}
        y={1260}
        w={170}
        h={18}
        rotate={5}
        color={C.yuzu}
      />
      <WashiTape
        x={1130}
        y={1255}
        w={150}
        h={16}
        rotate={-5}
        color={C.sakura}
      />
    </div>
  );
}
