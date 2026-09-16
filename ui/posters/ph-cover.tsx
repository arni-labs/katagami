/**
 * Katagami — X / Blog Hero (5:2)
 *
 * Left: big title block with marker highlights, Japanese subtitle, stamps.
 * Right: scrapbook collage of 5 mini "design language" cards — each a tiny
 * parody of its own style (Neo-Brutalism, Sumi-e Editorial, CRT Terminal,
 * Maximalist Pop, Retro Futurism). Washi tape, sparkles, dot-grid paper,
 * hand-drawn margin arrow. Front-page palette only.
 *
 * Render with:
 *   npx poster-ai export posters/x-hero.tsx -o posters/x-hero.png
 */

// ── Palette (matches ui/src/app/globals.css) ─────────────────────
const C = {
  paper: "oklch(1 0 0)",
  ink: "oklch(0.26 0.015 260)",
  muted: "oklch(0.5 0.01 260)",
  border: "oklch(0.9 0.006 260)",
  sakura: "oklch(0.7 0.21 0)",
  yuzu: "oklch(0.88 0.18 96)",
  salad: "oklch(0.82 0.13 112)",
  matcha: "oklch(0.68 0.09 150)",
  teal: "oklch(0.62 0.08 222)",
  ramune: "oklch(0.58 0.13 245)",
  sumire: "oklch(0.55 0.09 290)",
  beni: "oklch(0.62 0.19 27)",
} as const;

const FONT_DISPLAY =
  '"Bricolage Grotesque", "Nunito", ui-sans-serif, system-ui, sans-serif';
const FONT_SANS =
  '"Nunito", ui-sans-serif, system-ui, -apple-system, sans-serif';
const FONT_MONO =
  '"Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const FONT_HAND =
  '"Caveat", "Bradley Hand", "Segoe Print", cursive';
const FONT_SERIF =
  '"Cormorant Garamond", "EB Garamond", Georgia, "Times New Roman", serif';

const SHADOW_PAPER =
  "0 1px 2px rgba(30,35,45,0.04), 0 6px 18px rgba(30,35,45,0.06)";

// ── Atoms ─────────────────────────────────────────────────────────
function FontsAndVars() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800&family=Geist+Mono:wght@400;500;700&family=Caveat:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&display=swap');
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
  opacity = 0.85,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: number;
  color: string;
  opacity?: number;
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
        opacity,
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
  size = 13,
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
        padding: "6px 13px",
        fontFamily: FONT_MONO,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "0.14em",
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
  opacity = 0.65,
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

// Marker highlight — ink text on top of a palette-colored bar.
function Marker({
  children,
  tint,
}: {
  children: React.ReactNode;
  tint: string;
}) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: -3,
          right: -3,
          bottom: 4,
          height: "40%",
          background: tint,
          opacity: 0.85,
          borderRadius: 2,
          transform: "rotate(-0.3deg)",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
}

// ── Mini "design language" cards — each a tiny parody of its own style ─

const MINI_W = 180;
const MINI_H = 220;

function MiniFrame({
  x,
  y,
  rotate,
  tapeColor,
  tapeRot = -6,
  children,
}: {
  x: number;
  y: number;
  rotate: number;
  tapeColor: string;
  tapeRot?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: MINI_W,
        height: MINI_H,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <WashiTape
        x={-10}
        y={-8}
        w={80}
        h={16}
        rotate={tapeRot}
        color={tapeColor}
      />
      {children}
    </div>
  );
}

function CardLabel({
  children,
  color = C.ink,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 12,
        right: 12,
        fontFamily: FONT_MONO,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
      }}
    >
      {children}
    </div>
  );
}

function MiniBrutal() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: C.yuzu,
        border: "2.5px solid #111",
        boxShadow: "6px 6px 0 rgba(0,0,0,0.9)",
        padding: 14,
        boxSizing: "border-box",
        position: "relative",
        color: "#111",
        fontFamily: FONT_SANS,
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        № 001
      </div>
      <div
        style={{
          fontSize: 40,
          fontWeight: 900,
          lineHeight: 0.95,
          marginTop: 20,
          letterSpacing: "-0.03em",
        }}
      >
        BRUTAL.
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 22 }}>
        <div
          style={{
            background: "#111",
            color: "white",
            padding: "7px 12px",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          CLICK
        </div>
        <div
          style={{
            background: "white",
            color: "#111",
            border: "2px solid #111",
            padding: "5px 12px",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          OR
        </div>
      </div>
      <div
        style={{
          marginTop: 14,
          height: 6,
          background: "#111",
          width: "70%",
        }}
      />
      <CardLabel>neo-brutalism</CardLabel>
    </div>
  );
}

function MiniSumi() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#FAF7F1",
        boxShadow: SHADOW_PAPER,
        padding: 16,
        boxSizing: "border-box",
        position: "relative",
        color: "#1A1A22",
        fontFamily: FONT_SERIF,
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#5A5965",
        }}
      >
        ·  墨 ·
      </div>
      <div
        style={{
          fontSize: 32,
          fontStyle: "italic",
          fontWeight: 400,
          lineHeight: 1.02,
          marginTop: 22,
          letterSpacing: "-0.01em",
        }}
      >
        Sumi-e
        <br />
        Editorial.
      </div>
      {/* ink brush stroke */}
      <svg
        style={{ position: "absolute", left: 20, top: 150, width: 150, height: 40 }}
        viewBox="0 0 150 40"
      >
        <path
          d="M 0 22 C 20 6, 60 34, 90 16 C 115 2, 140 24, 150 18"
          fill="none"
          stroke="#1A1A22"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <CardLabel color="#1A1A22">sumi-e editorial</CardLabel>
    </div>
  );
}

function MiniCRT() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#0A0F0A",
        padding: 14,
        boxSizing: "border-box",
        position: "relative",
        fontFamily: FONT_MONO,
        color: "#64FF8D",
        overflow: "hidden",
      }}
    >
      {/* scanlines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.0) 0 2px, rgba(100,255,141,0.06) 2px 4px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        katagami@crt:~$
      </div>
      <div style={{ marginTop: 16, fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
        <div>&gt; boot katagami</div>
        <div style={{ opacity: 0.65 }}>loading tokens…</div>
        <div style={{ opacity: 0.65 }}>loading rules…</div>
        <div style={{ marginTop: 6 }}>
          &gt; READY
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 14,
              background: "#64FF8D",
              marginLeft: 4,
              verticalAlign: "middle",
            }}
          />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 14,
          right: 14,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#64FF8D",
          opacity: 0.8,
        }}
      >
        crt terminal
      </div>
    </div>
  );
}

function MiniPop() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(135deg, ${C.sakura} 0%, ${C.yuzu} 50%, ${C.teal} 100%)`,
        padding: 14,
        boxSizing: "border-box",
        position: "relative",
        color: C.ink,
        fontFamily: FONT_SANS,
      }}
    >
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: C.ink,
        }}
      >
        ✦ featured
      </div>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 42,
          fontWeight: 800,
          lineHeight: 0.9,
          marginTop: 20,
          letterSpacing: "-0.03em",
          color: "white",
          textShadow: "3px 3px 0 " + C.sumire,
        }}
      >
        POP!!
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 20 }}>
        {[C.sumire, C.beni, C.ramune, C.matcha].map((c) => (
          <div
            key={c}
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: c,
              boxShadow: "0 1px 0 rgba(30,35,45,0.15)",
            }}
          />
        ))}
      </div>
      {/* sparkle accents */}
      <div
        style={{ position: "absolute", left: 150, top: 24, fontSize: 16 }}
      >
        ✦
      </div>
      <div
        style={{ position: "absolute", right: 18, bottom: 56, fontSize: 14 }}
      >
        ✧
      </div>
      <CardLabel>maximalist pop</CardLabel>
    </div>
  );
}

function MiniRetro() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(180deg, #1A0B3F 0%, #5A1E66 58%, #D94A7E 100%)`,
        padding: 14,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT_SANS,
      }}
    >
      {/* perspective grid */}
      <svg
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "55%",
          opacity: 0.55,
        }}
        viewBox="0 0 200 140"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={"v" + i}
            x1={100 + (i - 6) * 30}
            y1={0}
            x2={100 + (i - 6) * 120}
            y2={140}
            stroke="#FF64B4"
            strokeWidth="0.5"
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={"h" + i}
            x1={0}
            y1={140 - i * i * 3 - i * 2}
            x2={200}
            y2={140 - i * i * 3 - i * 2}
            stroke="#FF64B4"
            strokeWidth="0.5"
          />
        ))}
      </svg>
      <div
        style={{
          fontFamily: FONT_MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#FFD6F5",
        }}
      >
        &lt;/ 198X /&gt;
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          lineHeight: 0.95,
          marginTop: 18,
          letterSpacing: "0.02em",
          color: "#FFE8FA",
          textShadow: "2px 2px 0 #00E6D4, 4px 4px 0 rgba(255,100,180,0.5)",
          fontFamily: FONT_DISPLAY,
        }}
      >
        RETRO
        <br />
        FUTURE
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 14,
          right: 14,
          fontFamily: FONT_MONO,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#FFE8FA",
        }}
      >
        retro-futurism
      </div>
    </div>
  );
}

// ── Poster ────────────────────────────────────────────────────────
export default function KatagamiHeroPoster() {
  return (
    <div
      className="w-[1270px] h-[760px]"
      style={{
        position: "relative",
        background: C.paper,
        backgroundImage: `radial-gradient(circle at 1px 1px, oklch(0.65 0.008 260 / 0.09) 1px, transparent 0)`,
        backgroundSize: "24px 24px",
        color: C.ink,
        overflow: "hidden",
        fontFamily: FONT_SANS,
      }}
    >
      <FontsAndVars />

      {/* halftone ink fields — same press layer as the gallery slides */}
      <div style={{ position:"absolute", left:-300, top:-280, width:760, height:760, pointerEvents:"none",
        backgroundImage:`radial-gradient(circle at 2px 2px, color-mix(in srgb, ${C.sakura} 52%, transparent) 1.7px, transparent 0)`,
        backgroundSize:"11px 11px",
        WebkitMaskImage:"radial-gradient(closest-side, black 12%, transparent 100%)",
        maskImage:"radial-gradient(closest-side, black 12%, transparent 100%)",
        mixBlendMode:"multiply", opacity:0.85 }} />
      <div style={{ position:"absolute", right:-260, bottom:-290, width:700, height:700, pointerEvents:"none",
        backgroundImage:`radial-gradient(circle at 2px 2px, color-mix(in srgb, ${C.ramune} 52%, transparent) 1.7px, transparent 0)`,
        backgroundSize:"11px 11px",
        WebkitMaskImage:"radial-gradient(closest-side, black 12%, transparent 100%)",
        maskImage:"radial-gradient(closest-side, black 12%, transparent 100%)",
        mixBlendMode:"multiply", opacity:0.85 }} />

      {/* Corner washi tapes pinning the whole canvas like a poster */}
      <WashiTape x={-20} y={26} w={150} h={22} rotate={-6} color={C.sakura} />
      <WashiTape x={1150} y={18} w={150} h={22} rotate={5} color={C.ramune} />
      <WashiTape x={-10} y={706} w={170} h={22} rotate={4} color={C.yuzu} />
      <WashiTape x={1160} y={712} w={160} h={22} rotate={-5} color={C.sakura} />

      {/* ─────── LEFT: Title block ─────── */}
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 118,
          width: 636,
        }}
      >
        {/* eyebrow — matches the landing page attribution pattern:
            teal bar · muted mono uppercase · yuzu-marker handle link. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            fontFamily: FONT_MONO,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: C.muted,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 36,
              height: 3,
              background: C.teal,
              borderRadius: 2,
            }}
          />
          <span>ideas by</span>
          <span
            style={{
              position: "relative",
              display: "inline-block",
              color: C.ink,
            }}
          >
            <span style={{ position: "relative", zIndex: 1 }}>@arni0x9053</span>
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: -3,
                right: -3,
                bottom: 1,
                height: 7,
                background: C.yuzu,
                opacity: 0.85,
                borderRadius: 1,
                transform: "rotate(-0.8deg)",
                zIndex: 0,
              }}
            />
          </span>
        </div>

        {/* Big title */}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 104,
            fontWeight: 800,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            color: C.ink,
            fontFeatureSettings: '"ss02", "ss04"',
          }}
        >
          <Marker tint={C.yuzu}>Katagami</Marker>
          <span style={{ color: C.sumire }}>.</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 34,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: "-0.015em",
            color: C.ink,
            marginTop: 18,
            maxWidth: 560,
          }}
        >
          Organizing the{" "}
          <Marker tint={C.sakura}>chaos</Marker> of design,
          <br />
          one <Marker tint={C.ramune}>language</Marker> at a time.
        </div>

      </div>

      {/* ─────── RIGHT: Gallery collage ─────── */}
      <MiniFrame x={642} y={96} rotate={-4.5} tapeColor={C.sakura} tapeRot={-8}>
        <MiniBrutal />
      </MiniFrame>
      <MiniFrame x={834} y={82} rotate={3} tapeColor={C.ramune} tapeRot={6}>
        <MiniSumi />
      </MiniFrame>
      <MiniFrame x={1024} y={110} rotate={-3} tapeColor={C.yuzu} tapeRot={-9}>
        <MiniCRT />
      </MiniFrame>
      <MiniFrame x={744} y={412} rotate={3.5} tapeColor={C.ramune} tapeRot={-6}>
        <MiniPop />
      </MiniFrame>
      <MiniFrame x={962} y={430} rotate={-4} tapeColor={C.yuzu} tapeRot={5}>
        <MiniRetro />
      </MiniFrame>

      {/* Hand-drawn margin note in the clear bottom-left area (below the
          stamps row), with a squiggly arrow pointing up-right toward the
          gallery. */}
      <span
        style={{
          position: "absolute",
          left: 96,
          top: 542,
          fontFamily: FONT_HAND,
          fontSize: 40,
          fontWeight: 600,
          color: C.sumire,
          transform: "rotate(-3deg)",
          transformOrigin: "left center",
          whiteSpace: "nowrap",
        }}
      >
        a growing library
      </span>
      <svg
        style={{
          position: "absolute",
          left: 446,
          top: 520,
          width: 224,
          height: 64,
          overflow: "visible",
        }}
      >
        <path
          d="M 0 48 C 36 26, 80 62, 124 36 C 160 16, 194 38, 214 20"
          fill="none"
          stroke={C.sumire}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M 204 12 L 216 18 L 210 30"
          fill="none"
          stroke={C.sumire}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Sparkle flourishes */}
      <Sparkle x={30} y={50} size={14} color={C.sumire} rotate={-15} />
      <Sparkle x={660} y={540} size={12} color={C.beni} rotate={18} />
      <Sparkle x={1260} y={560} size={13} color={C.matcha} rotate={-10} />
      <Sparkle x={680} y={560} size={10} color={C.yuzu} rotate={14} />
      <Sparkle x={40} y={540} size={12} color={C.ramune} rotate={-8} />
      <Sparkle x={1440} y={70} size={14} color={C.sakura} rotate={10} />
      <Sparkle x={1320} y={290} size={10} color={C.teal} rotate={20} />
    </div>
  );
}
