/**
 * Katagami — Design Language Facets (card only)
 *
 * A Katagami spec has 7 facets (2 optional). Rendered like the code-snippet
 * poster: translucent sticker card with thin top ribbon, washi tape corners,
 * chrome header, and a line-numbered definition-list body.
 *
 * Render with:
 *   npx poster-ai export posters/language-facets.tsx -o posters/language-facets.png
 */

// ── Palette (matches ui/src/app/globals.css) ─────────────────────
const C = {
  paper: "oklch(1 0 0)",
  ink: "oklch(0.26 0.015 260)",
  muted: "oklch(0.52 0.012 260)",
  border: "oklch(0.9 0.006 260)",
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

// ── Atoms ─────────────────────────────────────────────────────────
function FontsAndVars() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap');
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

// Marker-highlight key — ink text on top of a palette-colored marker bar,
// mirroring the front-page `.marker` treatment.
function MarkerKey({
  children,
  tint,
}: {
  children: React.ReactNode;
  tint: string;
}) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        fontFamily: FONT_DISPLAY,
        fontSize: 24,
        fontWeight: 700,
        color: C.ink,
        letterSpacing: "-0.01em",
        lineHeight: "32px",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: -3,
          right: -3,
          bottom: 2,
          height: "42%",
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

// Row — line number gutter, key w/ marker highlight, optional stamp,
// description in mono ink.
function Row({
  n,
  keyLabel,
  tint,
  desc,
  optional = false,
}: {
  n: number;
  keyLabel: string;
  tint: string;
  desc: string;
  optional?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        minHeight: 44,
        paddingLeft: 2,
      }}
    >
      <span
        style={{
          flex: "0 0 28px",
          textAlign: "right",
          color: "color-mix(in oklch, " + C.muted + " 55%, white)",
          fontFamily: FONT_MONO,
          fontSize: 13,
          lineHeight: "32px",
          userSelect: "none",
        }}
      >
        {n}
      </span>
      <span style={{ flex: "0 0 200px" }}>
        <MarkerKey tint={tint}>{keyLabel}</MarkerKey>
      </span>
      <span
        style={{
          flex: "0 0 80px",
          display: "flex",
          justifyContent: "flex-start",
        }}
      >
        {optional && (
          <Stamp color={C.sumire} rotate={-3} size={9}>
            optional
          </Stamp>
        )}
      </span>
      <span
        style={{
          flex: 1,
          fontFamily: FONT_MONO,
          fontSize: 15,
          lineHeight: "26px",
          color: C.ink,
        }}
      >
        {desc}
      </span>
    </div>
  );
}

// ── Poster ────────────────────────────────────────────────────────
export default function LanguageFacetsPoster() {
  const facets: {
    keyLabel: string;
    tint: string;
    desc: string;
    optional?: boolean;
  }[] = [
    // Marker tints match only the 5 palette colors used as front-page
    // highlighter markers: sumire, sakura, salad, teal, yuzu.
    {
      keyLabel: "Philosophy",
      tint: C.sumire,
      desc: "What this style believes — and what it rejects",
    },
    {
      keyLabel: "Tokens",
      tint: C.sakura,
      desc: "Colors, typography, spacing, shadows, motion",
    },
    {
      keyLabel: "Rules",
      tint: C.salad,
      desc: "How tokens combine into elements",
    },
    {
      keyLabel: "Layout",
      tint: C.teal,
      desc: "Grids, breakpoints, density, whitespace",
    },
    {
      keyLabel: "Guidance",
      tint: C.yuzu,
      desc: "Do\u2019s, don\u2019ts, usage context",
    },
    {
      keyLabel: "Imagery",
      tint: C.sakura,
      desc: "Art direction for generated/sourced images",
      optional: true,
    },
    {
      keyLabel: "Generative",
      tint: C.sumire,
      desc: "Canvas rules for decorative/background art",
      optional: true,
    },
  ];

  return (
    <div
      className="w-[1200px] h-[620px]"
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

      {/* Spec card — translucent, soft shadow, thin top ribbon, no border */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
          background: "rgba(255,255,255,0.95)",
          boxShadow:
            "0 1px 2px rgba(30,35,45,0.04), 0 10px 28px rgba(30,35,45,0.08)",
          borderRadius: 2,
          overflow: "visible",
        }}
      >
        {/* Top ribbon */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 4,
            background: C.sumire,
          }}
        />

        {/* Washi tapes pinning the card */}
        <WashiTape x={-14} y={-10} w={140} h={20} rotate={-5} color={C.sakura} />
        <WashiTape x={960} y={-8} w={120} h={18} rotate={6} color={C.teal} />

        {/* Chrome header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: `1px dashed ${C.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Stamp color={C.sumire} rotate={-3}>
              spec
            </Stamp>
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 22,
                fontWeight: 700,
                color: C.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Design Language
            </span>
          </div>
          <span
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: C.muted,
              fontWeight: 700,
            }}
          >
            7 facets · 2 optional
          </span>
        </div>

        {/* Definition list body */}
        <div style={{ padding: "18px 22px 22px" }}>
          {facets.map((f, i) => (
            <Row
              key={f.keyLabel}
              n={i + 1}
              keyLabel={f.keyLabel}
              tint={f.tint}
              desc={f.desc}
              optional={f.optional}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
