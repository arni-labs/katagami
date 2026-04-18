/**
 * Katagami — Agent Flow Poster
 *
 * Render with: `poster export posters/agent-flow.tsx -o flow.png`
 * or any poster-ai format (html/pdf/svg/jpg/webp).
 *
 * Self-contained — all color, layout, typography live in this file.
 * Uses the Katagami Hobonichi aesthetic: dot-grid paper, sticky-notes,
 * washi tape, stamps, marker highlights, sparkle doodles.
 */

// ── Palette (oklch values from globals.css, hex-approximated) ─────
const C = {
  paper: "#FEFDF9",
  ink: "#2B2A3F",
  muted: "#5F5C73",
  border: "#D4D1DC",
  sakura: "#F7BAC9",
  yuzu: "#F5E787",
  salad: "#BFE67A",
  matcha: "#8FD1A0",
  teal: "#8DD6DB",
  ramune: "#9EB8EE",
  sumire: "#C79DE4",
  beni: "#E46D6D",
};

// ── Atoms ─────────────────────────────────────────────────────────
function StickyNote({
  x,
  y,
  w,
  h,
  rotate = 0,
  tint,
  children,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  tint?: string;
  children: React.ReactNode;
}) {
  const bg = tint
    ? `color-mix(in srgb, ${tint} 14%, rgba(255,255,255,0.92))`
    : "rgba(255,255,255,0.92)";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        transform: `rotate(${rotate}deg)`,
        background: bg,
        boxShadow:
          "0 1px 2px rgba(30,35,45,0.05), 0 10px 26px rgba(30,35,45,0.08)",
        padding: 20,
      }}
    >
      {children}
    </div>
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
        background: `repeating-linear-gradient(45deg, ${color} 0 7px, color-mix(in oklch, ${color} 50%, white) 7px 14px)`,
        opacity: 0.85,
        boxShadow: "0 1px 2px rgba(30,35,45,0.05)",
      }}
    />
  );
}

function Stamp({
  children,
  color = C.sumire,
  rotate = -2,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1.4px solid ${color}`,
        borderRadius: 3,
        padding: "2px 9px",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color,
        background: `color-mix(in srgb, ${color} 8%, white)`,
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function Marker({
  children,
  color = C.yuzu,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: -4,
          right: -4,
          bottom: 4,
          height: "42%",
          background: color,
          opacity: 0.85,
          transform: "rotate(-0.4deg)",
          borderRadius: 2,
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
}

function Sparkle({
  x,
  y,
  size = 14,
  color = C.sumire,
  rotate = 0,
}: {
  x: number;
  y: number;
  size?: number;
  color?: string;
  rotate?: number;
}) {
  return (
    <svg
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `rotate(${rotate}deg)`,
      }}
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill={color}
    >
      <path d="M6 0.5 L7 4.9 L11.5 6 L7 7.1 L6 11.5 L5 7.1 L0.5 6 L5 4.9 Z" />
    </svg>
  );
}

// Dashed SVG connector with small arrowhead, from (x1,y1) to (x2,y2)
function Connector({
  x1,
  y1,
  x2,
  y2,
  color = C.ink,
  curve = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  curve?: number;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + curve;
  const d = `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`;
  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
      }}
      width={1200}
      height={1800}
      viewBox="0 0 1200 1800"
    >
      <defs>
        <marker
          id={`arrow-${x1}-${y1}-${x2}-${y2}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeDasharray="5 4"
        strokeLinecap="round"
        markerEnd={`url(#arrow-${x1}-${y1}-${x2}-${y2})`}
      />
    </svg>
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
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(75,70,100,0.12) 1px, transparent 0)`,
        backgroundSize: "22px 22px",
        color: C.ink,
        fontFamily:
          '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif',
        overflow: "hidden",
      }}
    >
      {/* ── Decorative washi tapes on the outer edges ── */}
      <WashiTape x={60} y={-10} w={120} h={22} rotate={-6} color={C.salad} />
      <WashiTape
        x={1000}
        y={-8}
        w={90}
        h={20}
        rotate={7}
        color={C.sumire}
      />
      <WashiTape
        x={80}
        y={1760}
        w={110}
        h={20}
        rotate={5}
        color={C.sakura}
      />
      <WashiTape
        x={990}
        y={1770}
        w={100}
        h={20}
        rotate={-6}
        color={C.teal}
      />

      {/* ── Header ── */}
      <div style={{ position: "absolute", left: 80, top: 80, right: 80 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 36,
              height: 3,
              borderRadius: 2,
              background: C.teal,
            }}
          />
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            katagami · how a language is made
          </span>
        </div>
        <h1
          style={{
            fontFamily:
              '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
            margin: 0,
            color: C.ink,
          }}
        >
          from a{" "}
          <Marker color={C.yuzu}>
            <span>single idea</span>
          </Marker>
          , a whole{" "}
          <Marker color={C.salad}>
            <span>gallery</span>
          </Marker>
        </h1>
        <p
          style={{
            marginTop: 14,
            maxWidth: 760,
            fontSize: 16,
            lineHeight: 1.55,
            color: C.muted,
          }}
        >
          Agents fan out from one seed into parallel sessions — each writes a
          full spec and embodiment, organizes itself, and publishes to the
          gallery. No human in the loop after "go".
        </p>
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <Stamp color={C.sakura} rotate={-3}>
            v0.1.0
          </Stamp>
          <Stamp color={C.sumire} rotate={2}>
            agent-native
          </Stamp>
        </div>
      </div>

      {/* ── Step 1 · Idea ── */}
      <StickyNote x={420} y={280} w={360} h={170} rotate={-1} tint={C.sakura}>
        <WashiTape
          x={-12}
          y={-10}
          w={90}
          h={16}
          rotate={-5}
          color={C.sakura}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Stamp color={C.sakura}>step · 01</Stamp>
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            the seed
          </span>
        </div>
        <h3
          style={{
            fontFamily:
              '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 28,
            margin: "10px 0 6px",
            color: C.ink,
          }}
        >
          Idea
        </h3>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 20,
            color: C.ink,
            opacity: 0.85,
          }}
        >
          &ldquo;sci-fi meets editorial&rdquo;
        </div>
      </StickyNote>
      <Sparkle x={780} y={290} color={C.sumire} size={18} />
      <Sparkle x={400} y={410} color={C.yuzu} size={14} rotate={15} />

      {/* ── Arrow 1 → 2 ── */}
      <Connector x1={600} y1={455} x2={600} y2={540} color={C.ink} />

      {/* ── Step 2 · Research ── */}
      <StickyNote x={360} y={550} w={480} h={200} rotate={0.5} tint={C.teal}>
        <WashiTape
          x={400}
          y={-10}
          w={80}
          h={16}
          rotate={6}
          color={C.teal}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Stamp color={C.teal}>step · 02</Stamp>
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            one agent session
          </span>
        </div>
        <h3
          style={{
            fontFamily:
              '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 28,
            margin: "10px 0 6px",
            color: C.ink,
          }}
        >
          Research
        </h3>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: C.ink,
            opacity: 0.85,
            margin: 0,
          }}
        >
          Searches the web, reads articles and style guides, identifies{" "}
          <b>N promising directions</b>. Auto-fans-out a separate session for
          each.
        </p>
      </StickyNote>

      {/* ── Branching connectors from Research to S1, S2, S3 ── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 790,
          right: 80,
          textAlign: "center",
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        ⇣ auto-fans-out ⇣
      </div>
      <Connector x1={600} y1={755} x2={220} y2={900} color={C.ink} curve={40} />
      <Connector x1={600} y1={755} x2={600} y2={900} color={C.ink} />
      <Connector x1={600} y1={755} x2={980} y2={900} color={C.ink} curve={40} />

      {/* ── Step 3 · Synthesize (S1 / S2 / S3 — label + example, no repeat copy) ── */}
      {(
        [
          { x: 80, y: 900, tint: C.salad, label: "S1", title: "Earthshine Obs." },
          { x: 460, y: 900, tint: C.yuzu, label: "S2", title: "Holo-Review" },
          { x: 840, y: 900, tint: C.ramune, label: "S3", title: "Nebula Weekly" },
        ] as const
      ).map((s, i) => (
        <StickyNote
          key={s.label}
          x={s.x}
          y={s.y}
          w={280}
          h={120}
          rotate={(i - 1) * 1.2}
          tint={s.tint}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stamp color={s.tint}>synthesize</Stamp>
            <span
              style={{
                fontFamily:
                  '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
                fontSize: 36,
                fontWeight: 900,
                color: s.tint,
                opacity: 0.75,
              }}
            >
              {s.label}
            </span>
          </div>
          <h4
            style={{
              fontFamily:
                '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 20,
              margin: "10px 0 0",
              color: C.ink,
              lineHeight: 1.1,
            }}
          >
            {s.title}
          </h4>
        </StickyNote>
      ))}

      {/* Single shared caption under the Synthesize row */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 1030,
          right: 80,
          textAlign: "center",
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        ↳ each: full spec + embodiment, its own sandbox
      </div>

      {/* ── Arrows S → O ── */}
      <Connector x1={220} y1={1060} x2={220} y2={1120} color={C.ink} />
      <Connector x1={600} y1={1060} x2={600} y2={1120} color={C.ink} />
      <Connector x1={980} y1={1060} x2={980} y2={1120} color={C.ink} />

      {/* ── Step 4 · Organize (just the labels; shared caption below) ── */}
      {(
        [
          { x: 80, y: 1130, tint: C.matcha, label: "O1" },
          { x: 460, y: 1130, tint: C.sumire, label: "O2" },
          { x: 840, y: 1130, tint: C.sakura, label: "O3" },
        ] as const
      ).map((o, i) => (
        <StickyNote
          key={o.label}
          x={o.x}
          y={o.y}
          w={280}
          h={90}
          rotate={(i - 1) * -0.8}
          tint={o.tint}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stamp color={o.tint}>organize</Stamp>
            <span
              style={{
                fontFamily:
                  '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
                fontSize: 32,
                fontWeight: 900,
                color: o.tint,
                opacity: 0.75,
                lineHeight: 1,
              }}
            >
              {o.label}
            </span>
          </div>
        </StickyNote>
      ))}

      {/* Single shared caption under the Organize row */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 1230,
          right: 80,
          textAlign: "center",
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        ↳ auto-records taxonomy · tags · lineage
      </div>

      {/* ── Converging arrows O → Gallery ── */}
      <Connector x1={220} y1={1260} x2={600} y2={1440} color={C.ink} curve={-30} />
      <Connector x1={600} y1={1260} x2={600} y2={1440} color={C.ink} />
      <Connector x1={980} y1={1260} x2={600} y2={1440} color={C.ink} curve={-30} />

      {/* ── Step 5 · Gallery ── */}
      <StickyNote
        x={320}
        y={1450}
        w={560}
        h={210}
        rotate={-0.6}
        tint={C.yuzu}
      >
        <WashiTape
          x={-14}
          y={-10}
          w={110}
          h={18}
          rotate={-7}
          color={C.yuzu}
        />
        <WashiTape
          x={460}
          y={-8}
          w={80}
          h={16}
          rotate={8}
          color={C.sakura}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Stamp color={C.beni}>step · 05</Stamp>
          <span
            style={{
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            published · browsable
          </span>
        </div>
        <h3
          style={{
            fontFamily:
              '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 34,
            margin: "10px 0 6px",
            color: C.ink,
          }}
        >
          <Marker color={C.salad}>
            <span>Gallery</span>
          </Marker>
        </h3>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            color: C.ink,
            opacity: 0.85,
            margin: 0,
          }}
        >
          <b>N new languages</b>, each with its own palette, typography, spec,
          and embodiment. Published. Browsable. Forkable.
        </p>
      </StickyNote>
      <Sparkle x={290} y={1460} color={C.sumire} size={20} rotate={-10} />
      <Sparkle x={870} y={1640} color={C.teal} size={16} rotate={20} />

      {/* ── Footer · Legend + attribution ── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span>
            <b style={{ color: C.salad }}>S</b> = synthesize
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>
            <b style={{ color: C.sumire }}>O</b> = organize
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily:
                '"Bricolage Grotesque", "Inter", system-ui, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: C.ink,
              letterSpacing: "-0.02em",
            }}
          >
            型紙
          </span>
          <span>katagami.vercel.app</span>
        </div>
      </div>
    </div>
  );
}
