/**
 * Katagami — Code Snippet (card only)
 *
 * Just the Python snippet card — no poster header, no sparkles, no footer
 * rail. Washi-tape accents and the Katagami dot-grid paper around it so
 * it still reads in-family, but everything is about the code.
 *
 * Render with:
 *   poster export posters/code-snippet.tsx -o posters/code-snippet.png
 */

// ── Palette ───────────────────────────────────────────────────────
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
  sumire: "#C79DE4",
  kw: "#7E4BB0",
  str: "#4E8F3C",
  method: "#1E7A86",
  comment: "#8A8599",
};

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
}: {
  children: React.ReactNode;
  color?: string;
  rotate?: number;
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
      }}
    >
      {children}
    </span>
  );
}

// ── Syntax atoms ─────────────────────────────────────────────────
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

// Keep unused atoms live for tooling (tsx transform keeps all imports).
void KW;

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
      className="w-[1100px] h-[560px]"
      style={{
        position: "relative",
        background: C.paper,
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(75,70,100,0.12) 1px, transparent 0)`,
        backgroundSize: "22px 22px",
        color: C.ink,
        overflow: "hidden",
      }}
    >
      {/* Code card — nearly fills the canvas */}
      <div
        style={{
          position: "absolute",
          left: 30,
          top: 30,
          right: 30,
          bottom: 30,
          background: "#FFFFFF",
          boxShadow:
            "0 1px 2px rgba(30,35,45,0.05), 0 14px 36px rgba(30,35,45,0.09)",
        }}
      >
        {/* Washi tapes pinning the card */}
        <WashiTape x={-14} y={-10} w={140} h={20} rotate={-5} color={C.yuzu} />
        <WashiTape x={620} y={-8} w={100} h={18} rotate={6} color={C.sakura} />

        {/* Editor chrome bar */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
            python 3 · 11 lines
          </span>
        </div>

        {/* Code body */}
        <div style={{ padding: "20px 18px 22px" }}>
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
      </div>
    </div>
  );
}
