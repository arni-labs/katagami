/**
 * Katagami — Agent Flow Poster
 * Visual language: "Signal Press Brutalism"
 *   - Archivo (Narrow/Condensed) display, IBM Plex Mono utility labels
 *   - 3px black rules, square corners, fluorescent-orange offset backplates
 *   - Visible grid, crop marks, asymmetric columns, spot-ink accents
 *
 * Render with:
 *   poster export posters/agent-flow.tsx -o posters/agent-flow.png
 */

// ── Tokens ────────────────────────────────────────────────────────
const C = {
  ink: "#0a0a0a",
  paper: "#f1ede3",
  surface: "#fffdf8",
  secondary: "#f3efe6",
  muted: "#5f5a52",
  accent: "#ff5a1f", // fluorescent spot ink
  acid: "#d4ff3a", // secondary spot (acid lime)
  text: "#111111",
};

const FONT_DISPLAY =
  '"Archivo Narrow", "Archivo Condensed", "Barlow Condensed", Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
const FONT_SANS =
  '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"IBM Plex Mono", "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

// ── Atoms ─────────────────────────────────────────────────────────

function MonoStrip({
  children,
  color = C.ink,
  bg = "transparent",
  borderless = false,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  borderless?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: FONT_MONO,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color,
        background: bg,
        padding: borderless ? "0" : "3px 8px",
        border: borderless ? "none" : `2px solid ${C.ink}`,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// A block with a thick black border and a fluorescent offset backplate
// behind it — the signature "overprinted poster mounted on the page" look.
function Block({
  x,
  y,
  w,
  h,
  offset = 10,
  plate = C.accent,
  bg = C.surface,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  offset?: number;
  plate?: string;
  bg?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {/* Offset backplate */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate(${offset}px, ${offset}px)`,
          background: plate,
        }}
      />
      {/* Foreground card */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: bg,
          border: `3px solid ${C.ink}`,
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Crop marks at the corners of a region.
function CropMarks({
  x,
  y,
  w,
  h,
  size = 14,
  color = C.ink,
  stroke = 2,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  size?: number;
  color?: string;
  stroke?: number;
}) {
  const corners = [
    { cx: x, cy: y },
    { cx: x + w, cy: y },
    { cx: x, cy: y + h },
    { cx: x + w, cy: y + h },
  ];
  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
      width={1200}
      height={1800}
      viewBox="0 0 1200 1800"
    >
      {corners.map((c, i) => (
        <g key={i} stroke={color} strokeWidth={stroke}>
          <line x1={c.cx - size} y1={c.cy} x2={c.cx + size} y2={c.cy} />
          <line x1={c.cx} y1={c.cy - size} x2={c.cx} y2={c.cy + size} />
        </g>
      ))}
    </svg>
  );
}

// Solid heavy arrow between two points.
function FlowArrow({
  x1,
  y1,
  x2,
  y2,
  color = C.ink,
  width = 4,
  curve = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  curve?: number;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + curve;
  const markerId = `arrow-${x1}-${y1}-${x2}-${y2}`;
  return (
    <svg
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
      width={1200}
      height={1800}
      viewBox="0 0 1200 1800"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <path
        d={`M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="square"
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  );
}

// Thick horizontal rule.
function Rule({
  x,
  y,
  w,
  h = 4,
  color = C.ink,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  color?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: color,
      }}
    />
  );
}

// Massive section-number + label.
function SectionHeader({
  x,
  y,
  num,
  kicker,
  title,
  titleColor = C.ink,
}: {
  x: number;
  y: number;
  num: string;
  kicker: string;
  title: string;
  titleColor?: string;
}) {
  return (
    <div
      style={{ position: "absolute", left: x, top: y, display: "flex", gap: 14, alignItems: "flex-end" }}
    >
      <span
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 72,
          fontWeight: 900,
          lineHeight: 0.85,
          letterSpacing: "-0.04em",
          color: C.accent,
          transform: "scaleX(0.85)",
          transformOrigin: "left bottom",
          display: "inline-block",
        }}
      >
        {num}
      </span>
      <div style={{ marginBottom: 4 }}>
        <MonoStrip bg={C.accent} color={C.ink}>
          {kicker}
        </MonoStrip>
        <h2
          style={{
            margin: "6px 0 0",
            fontFamily: FONT_DISPLAY,
            fontSize: 44,
            fontWeight: 800,
            lineHeight: 0.9,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: titleColor,
            transform: "scaleX(0.9)",
            transformOrigin: "left bottom",
            display: "inline-block",
          }}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}

// ── Poster ────────────────────────────────────────────────────────
export default function AgentFlowPoster() {
  return (
    <div
      className="w-[1200px] h-[1800px]"
      style={{
        position: "relative",
        background: C.paper,
        // Visible print-style grid
        backgroundImage: `
          linear-gradient(to right, rgba(16,16,16,0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(16,16,16,0.05) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        color: C.text,
        overflow: "hidden",
        fontFamily: FONT_SANS,
      }}
    >
      {/* Load the brutalist publication fonts */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
            @media print { body { background: ${C.paper}; } }
          `,
        }}
      />

      {/* ── Top issue strip ── */}
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `3px solid ${C.ink}`,
          paddingBottom: 10,
        }}
      >
        <MonoStrip bg={C.ink} color={C.paper}>
          型紙 · katagami
        </MonoStrip>
        <div style={{ display: "flex", gap: 10 }}>
          <MonoStrip>spread 04</MonoStrip>
          <MonoStrip>issue 01</MonoStrip>
          <MonoStrip bg={C.accent}>agent · native</MonoStrip>
        </div>
      </div>

      {/* ── Masthead ── */}
      <div style={{ position: "absolute", left: 40, top: 100, right: 40 }}>
        <MonoStrip bg={C.ink} color={C.paper}>
          A · no human in the loop after &quot;go&quot;
        </MonoStrip>
        <h1
          style={{
            margin: "14px 0 0",
            fontFamily: FONT_DISPLAY,
            fontSize: 128,
            fontWeight: 900,
            lineHeight: 0.88,
            letterSpacing: "-0.035em",
            textTransform: "uppercase",
            color: C.ink,
            transform: "scaleX(0.82)",
            transformOrigin: "left top",
            display: "inline-block",
          }}
        >
          How one idea
          <br />
          becomes a{" "}
          <span
            style={{
              background: C.accent,
              padding: "0 12px",
              display: "inline-block",
              color: C.ink,
            }}
          >
            gallery
          </span>
        </h1>
        <p
          style={{
            marginTop: 20,
            maxWidth: 820,
            fontFamily: FONT_SANS,
            fontSize: 17,
            lineHeight: 1.55,
            color: C.text,
          }}
        >
          Agents fan out from one seed into parallel sessions. Each writes a
          full spec + embodiment, organizes itself, publishes. The pipeline
          below runs unattended — research, synthesize × N, organize × N,
          gallery — with every stage emitting its own artifacts.
        </p>
      </div>

      {/* ── Rule between masthead and body ── */}
      <Rule x={40} y={498} w={1120} h={6} />

      {/* ── 01 · IDEA ── */}
      <SectionHeader
        x={40}
        y={528}
        num="01"
        kicker="the seed · 1 input"
        title="Idea"
      />
      <Block x={40} y={640} w={560} h={150} offset={10} plate={C.accent}>
        <MonoStrip>submitted · by user</MonoStrip>
        <div
          style={{
            marginTop: 10,
            fontFamily: FONT_DISPLAY,
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            color: C.ink,
            transform: "scaleX(0.9)",
            transformOrigin: "left top",
            display: "inline-block",
          }}
        >
          &ldquo;Sci-fi meets editorial&rdquo;
        </div>
      </Block>
      <CropMarks x={40} y={640} w={560} h={150} />

      {/* Right margin annotation rail */}
      <div
        style={{
          position: "absolute",
          left: 640,
          top: 640,
          width: 520,
          height: 150,
          borderLeft: `2px solid ${C.ink}`,
          padding: "10px 0 0 16px",
          fontFamily: FONT_MONO,
          fontSize: 12,
          lineHeight: 1.6,
          color: C.muted,
        }}
      >
        <div style={{ color: C.ink, fontWeight: 600, marginBottom: 6 }}>
          // MARGIN · INPUT
        </div>
        One plain string. No JSON, no schema. Anything the user can type:
        a vibe, a brief, a reference, a contradiction. The pipeline treats
        it as editorial brief for the research agent.
      </div>

      {/* ── Flow arrow 01 → 02 ── */}
      <FlowArrow x1={320} y1={820} x2={320} y2={876} width={4} />

      {/* ── 02 · RESEARCH ── */}
      <SectionHeader
        x={40}
        y={870}
        num="02"
        kicker="one agent session"
        title="Research"
      />
      <Block x={40} y={990} w={1120} h={130} offset={10} plate={C.accent}>
        <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
          <div style={{ flex: 1 }}>
            <MonoStrip>reads · web</MonoStrip>
            <h3
              style={{
                margin: "8px 0 6px",
                fontFamily: FONT_DISPLAY,
                fontSize: 26,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
              }}
            >
              Searches + reads
            </h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.muted }}>
              Articles, style guides, editorial archives, design history.
            </p>
          </div>
          <div style={{ width: 2, background: C.ink }} />
          <div style={{ flex: 1 }}>
            <MonoStrip>identifies · N</MonoStrip>
            <h3
              style={{
                margin: "8px 0 6px",
                fontFamily: FONT_DISPLAY,
                fontSize: 26,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
              }}
            >
              N directions
            </h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.muted }}>
              Distinct, promising, mutually-exclusive angles worth pursuing.
            </p>
          </div>
          <div style={{ width: 2, background: C.ink }} />
          <div style={{ flex: 1 }}>
            <MonoStrip bg={C.accent}>fans · out</MonoStrip>
            <h3
              style={{
                margin: "8px 0 6px",
                fontFamily: FONT_DISPLAY,
                fontSize: 26,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
              }}
            >
              Auto-spawns
            </h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.muted }}>
              One synthesize job per direction. Parallel. Sandboxed.
            </p>
          </div>
        </div>
      </Block>

      {/* Fan-out connectors */}
      <FlowArrow x1={200} y1={1150} x2={200} y2={1230} curve={0} />
      <FlowArrow x1={600} y1={1150} x2={600} y2={1230} curve={0} />
      <FlowArrow x1={1000} y1={1150} x2={1000} y2={1230} curve={0} />

      {/* ── 03 · SYNTHESIZE × N ── */}
      <SectionHeader
        x={40}
        y={1200}
        num="03"
        kicker="synthesize · parallel"
        title="Draft × N"
      />

      {(
        [
          {
            x: 40,
            tag: "S1",
            name: "Earthshine Obs.",
            note: "Dense editorial grid, spot colour, reader rails.",
          },
          {
            x: 420,
            tag: "S2",
            name: "Holo-Review",
            note: "Display-heavy spread; tactile scanned texture.",
          },
          {
            x: 800,
            tag: "S3",
            name: "Nebula Weekly",
            note: "Tall masthead, vertical dividers, issue badges.",
          },
        ] as const
      ).map((s) => (
        <div key={s.tag}>
          <Block
            x={s.x}
            y={1330}
            w={360}
            h={200}
            offset={10}
            plate={C.accent}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}
            >
              <MonoStrip>synthesize</MonoStrip>
              <span
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 72,
                  fontWeight: 900,
                  lineHeight: 0.82,
                  color: C.ink,
                  letterSpacing: "-0.04em",
                  transform: "scaleX(0.8)",
                  transformOrigin: "right top",
                  display: "inline-block",
                }}
              >
                {s.tag}
              </span>
            </div>
            <h4
              style={{
                margin: "10px 0 8px",
                fontFamily: FONT_DISPLAY,
                fontSize: 22,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "-0.01em",
              }}
            >
              {s.name}
            </h4>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                lineHeight: 1.5,
                color: C.muted,
              }}
            >
              {s.note}
            </p>
            <div
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: 14,
                borderTop: `2px solid ${C.ink}`,
                paddingTop: 6,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <MonoStrip borderless color={C.muted}>
                spec · embodiment
              </MonoStrip>
              <MonoStrip borderless color={C.ink}>
                → organize
              </MonoStrip>
            </div>
          </Block>
          <CropMarks x={s.x} y={1330} w={360} h={200} />
        </div>
      ))}

      {/* Synthesize → Organize arrows (straight down) */}
      <FlowArrow x1={200} y1={1540} x2={200} y2={1608} />
      <FlowArrow x1={600} y1={1540} x2={600} y2={1608} />
      <FlowArrow x1={1000} y1={1540} x2={1000} y2={1608} />

      {/* ── 04 · ORGANIZE × N ── */}
      <div style={{ position: "absolute", left: 40, top: 1580, display: "flex", gap: 14, alignItems: "center" }}>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 40,
            fontWeight: 900,
            color: C.accent,
            transform: "scaleX(0.85)",
            transformOrigin: "left center",
            display: "inline-block",
            lineHeight: 1,
          }}
        >
          04
        </span>
        <MonoStrip bg={C.accent}>organize · auto-spawns</MonoStrip>
        <h2
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 28,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
          }}
        >
          Classify × N
        </h2>
      </div>

      {(
        [
          { x: 40, tag: "O1" },
          { x: 420, tag: "O2" },
          { x: 800, tag: "O3" },
        ] as const
      ).map((o) => (
        <Block key={o.tag} x={o.x} y={1630} w={360} h={110} offset={8} plate={C.acid}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <MonoStrip>organize</MonoStrip>
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 44,
                fontWeight: 900,
                lineHeight: 0.85,
                color: C.ink,
                letterSpacing: "-0.03em",
                transform: "scaleX(0.8)",
                transformOrigin: "right top",
                display: "inline-block",
              }}
            >
              {o.tag}
            </span>
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 12,
              lineHeight: 1.5,
              color: C.muted,
            }}
          >
            Taxonomy, tags, lineage, related works — recorded on commit.
          </p>
        </Block>
      ))}

      {/* Converging to Gallery */}
      <FlowArrow x1={200} y1={1740} x2={600} y2={1772} curve={-12} />
      <FlowArrow x1={600} y1={1740} x2={600} y2={1772} />
      <FlowArrow x1={1000} y1={1740} x2={600} y2={1772} curve={-12} />

      {/* ── 05 · GALLERY (foot block) ── */}
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          bottom: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `3px solid ${C.ink}`,
          paddingTop: 10,
          gap: 20,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <MonoStrip bg={C.ink} color={C.paper}>
            05
          </MonoStrip>
          <MonoStrip>published · browsable · forkable</MonoStrip>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 34,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: C.ink,
              background: C.accent,
              padding: "2px 10px",
              transform: "scaleX(0.9)",
              transformOrigin: "right center",
              display: "inline-block",
            }}
          >
            Gallery · N
          </span>
          <MonoStrip>katagami.vercel.app</MonoStrip>
        </div>
      </div>
    </div>
  );
}
