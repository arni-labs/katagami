/**
 * Katagami — Code Snippet Poster
 *
 * A single Python snippet rendered as a scrapbook/sticky-note card.
 * Same Hobonichi aesthetic as agent-flow.tsx: dot-grid paper, washi
 * tape corners, marker highlight, sumire sparkles.
 *
 * Render with:
 *   poster export posters/code-snippet.tsx -o posters/code-snippet.png
 */

// ── Palette (hex-approximated from globals.css OKLCH) ─────────────
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
  // syntax-highlight tones (slightly desaturated from palette for legibility)
  kw: "#7E4BB0", // sumire-ink
  str: "#4E8F3C", // salad-ink
  method: "#1E7A86", // teal-ink
  comment: "#8A8599", // muted
};

const FONT_DISPLAY =
  '"Bricolage Grotesque", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_SANS =
  '"Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_MONO =
  '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// ── Atoms ─────────────────────────────────────────────────────────

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
        gap: 4,
        border: `1.4px solid ${color}`,
        borderRadius: 3,
        padding: "3px 10px",
        fontFamily: FONT_MONO,
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

// ── Syntax-colored tokens ────────────────────────────────────────
function KW({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.kw, fontWeight: 600 }}>{children}</span>;
}
function Str({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.str }}>{children}</span>;
}
function Method({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.method, fontWeight: 600 }}>{children}</span>;
}
function Var({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.ink }}>{children}</span>;
}
function Comment({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: C.comment, fontStyle: "italic" }}>{children}</span>
  );
}
function Punc({ children }: { children: React.ReactNode }) {
  return <span style={{ color: C.muted }}>{children}</span>;
}

// One code line with optional line number.
function Line({
  n,
  children,
}: {
  n?: number | string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 18,
        minHeight: 28,
        paddingLeft: 4,
      }}
    >
      <span
        style={{
          flex: "0 0 28px",
          textAlign: "right",
          color: "rgba(95,92,115,0.55)",
          fontFamily: FONT_MONO,
          fontSize: 13,
          lineHeight: "28px",
          userSelect: "none",
        }}
      >
        {n ?? ""}
      </span>
      <span
        style={{
          fontFamily: FONT_MONO,
          fontSize: 18,
          lineHeight: "28px",
          color: C.ink,
          whiteSpace: "pre",
          flex: 1,
        }}
      >
        {children}
      </span>
    </div>
  );
}

// ── Poster ────────────────────────────────────────────────────────
export default function CodeSnippetPoster() {
  return (
    <div
      className="w-[1200px] h-[1500px]"
      style={{
        position: "relative",
        background: C.paper,
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(75,70,100,0.12) 1px, transparent 0)`,
        backgroundSize: "22px 22px",
        color: C.ink,
        fontFamily: FONT_SANS,
        overflow: "hidden",
      }}
    >
      {/* Corner washi tapes */}
      <WashiTape x={60} y={-8} w={120} h={22} rotate={-6} color={C.salad} />
      <WashiTape x={1000} y={-6} w={90} h={20} rotate={7} color={C.sumire} />
      <WashiTape x={80} y={1460} w={110} h={20} rotate={5} color={C.sakura} />
      <WashiTape x={990} y={1470} w={100} h={20} rotate={-6} color={C.teal} />

      {/* ── Header ── */}
      <div style={{ position: "absolute", left: 80, top: 90, right: 80 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
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
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            katagami · temper · snippet
          </span>
        </div>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 68,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            margin: 0,
            color: C.ink,
          }}
        >
          create a{" "}
          <Marker color={C.salad}>
            <span>design language</span>
          </Marker>
          <br />
          in a few{" "}
          <Marker color={C.yuzu}>
            <span>actions</span>
          </Marker>
        </h1>
        <p
          style={{
            marginTop: 18,
            maxWidth: 780,
            fontFamily: FONT_SANS,
            fontSize: 17,
            lineHeight: 1.55,
            color: C.muted,
          }}
        >
          One entity, a few typed actions, a published language. No schemas
          to wrestle, no migrations to run — the whole lifecycle is just
          methods on the Temper client.
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
            python
          </Stamp>
          <Stamp color={C.sumire} rotate={2}>
            agent-native
          </Stamp>
        </div>
      </div>

      {/* ── Code card ── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          top: 420,
          right: 80,
          padding: 0,
        }}
      >
        <div
          style={{
            position: "relative",
            background: "#FFFFFF",
            boxShadow:
              "0 1px 2px rgba(30,35,45,0.05), 0 14px 36px rgba(30,35,45,0.09)",
          }}
        >
          {/* Washi tape pinning the card to the page */}
          <WashiTape
            x={-14}
            y={-10}
            w={140}
            h={20}
            rotate={-5}
            color={C.yuzu}
          />
          <WashiTape
            x={640}
            y={-8}
            w={90}
            h={18}
            rotate={6}
            color={C.sakura}
          />
          {/* Editor "chrome" bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderBottom: `1px dashed ${C.border}`,
              background: "rgba(248,246,241,0.65)",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <Stamp color={C.matcha} rotate={-3}>
                snippet
              </Stamp>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  color: C.muted,
                  letterSpacing: "0.05em",
                }}
              >
                temper-client.py
              </span>
            </div>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: C.muted,
              }}
            >
              14 lines · python 3
            </span>
          </div>

          {/* Code body */}
          <div style={{ padding: "22px 18px 26px" }}>
            <Line n={1}>
              <Var>lang</Var> <Punc>=</Punc> <Method>temper.create</Method>
              <Punc>(</Punc>
              <Str>&apos;DesignLanguages&apos;</Str>
              <Punc>,</Punc> <Punc>{"{"}</Punc>
              <Str>&apos;Id&apos;</Str>
              <Punc>:</Punc> <Str>&apos;retro-futurism-crt&apos;</Str>
              <Punc>{"}"})</Punc>
            </Line>
            <Line n={2}>
              <Var>eid</Var> <Punc>=</Punc> <Var>lang</Var>
              <Punc>[</Punc>
              <Str>&apos;entity_id&apos;</Str>
              <Punc>]</Punc>
            </Line>
            <Line n={3}> </Line>
            <Line n={4}>
              <Method>temper.action</Method>
              <Punc>(</Punc>
              <Str>&apos;DesignLanguages&apos;</Str>
              <Punc>,</Punc> <Var>eid</Var>
              <Punc>,</Punc>{" "}
              <Str>&apos;WritePhilosophy&apos;</Str>
              <Punc>,</Punc> <Punc>{"{"}</Punc>
            </Line>
            <Line n={5}>
              {"    "}
              <Str>&apos;philosophy&apos;</Str>
              <Punc>:</Punc> <Method>json.dumps</Method>
              <Punc>(</Punc>
              <Var>philosophy</Var>
              <Punc>)</Punc>
            </Line>
            <Line n={6}>
              <Punc>{"}"})</Punc>
            </Line>
            <Line n={7}> </Line>
            <Line n={8}>
              <Comment># ... SetTokens, SetRules, SetLayout, SetGuidance, etc.</Comment>
            </Line>
            <Line n={9}> </Line>
            <Line n={10}>
              <Method>temper.action</Method>
              <Punc>(</Punc>
              <Str>&apos;DesignLanguages&apos;</Str>
              <Punc>,</Punc> <Var>eid</Var>
              <Punc>,</Punc>{" "}
              <Str>&apos;SubmitForReview&apos;</Str>
              <Punc>,</Punc> <Punc>{"{"}</Punc>
              <Punc>{"}"})</Punc>
            </Line>
            <Line n={11}>
              <Method>temper.action</Method>
              <Punc>(</Punc>
              <Str>&apos;DesignLanguages&apos;</Str>
              <Punc>,</Punc> <Var>eid</Var>
              <Punc>,</Punc>{" "}
              <Str>&apos;Publish&apos;</Str>
              <Punc>,</Punc> <Punc>{"{"}</Punc>
              <Punc>{"}"})</Punc>
            </Line>
          </div>
          {/* Footer caption */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 18px",
              borderTop: `1px dashed ${C.border}`,
              background: "rgba(248,246,241,0.45)",
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            <span>↳ draft → under review → published</span>
            <span>型紙 · one entity · 4 actions</span>
          </div>
        </div>
      </div>

      {/* Sparkles around the code card */}
      <Sparkle x={60} y={440} color={C.sumire} size={18} rotate={-10} />
      <Sparkle x={1120} y={470} color={C.yuzu} size={16} rotate={15} />
      <Sparkle x={55} y={1180} color={C.sakura} size={14} rotate={22} />
      <Sparkle x={1120} y={1200} color={C.teal} size={16} rotate={-20} />

      {/* ── Bottom rail ── */}
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          bottom: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px dashed ${C.border}`,
          paddingTop: 14,
          fontFamily: FONT_MONO,
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span>
            <b style={{ color: C.sumire }}>⌘</b> temper api
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>
            <b style={{ color: C.salad }}>✎</b> one entity
          </span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>
            <b style={{ color: C.yuzu }}>★</b> typed actions
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontFamily: FONT_DISPLAY,
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
