/**
 * Katagami — System Diagram (minimalistic)
 *
 * Human → Any agent → (Katagami ⇄ TemperPaw → Modal / TensorLake) → Temper → Datadog.
 * Minimalistic Hobonichi feel: Bricolage / Nunito / Geist Mono,
 * palette-tinted cards with thin top ribbons, STRAIGHT connectors,
 * readable stamp labels, dot-grid paper. Only two washi strips pinning
 * the canvas corners — no per-card tape or sparkles.
 *
 * Render with:
 *   npx poster-ai export posters/system-diagram.tsx -o posters/system-diagram.png
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

// Unified, readable type scale — sizes bumped so body text reads at
// poster scale, not just titles.
const T = {
  eyebrow: 14, // uppercase mono
  body: 19, // bullet rows (sans for legibility)
  chip: 18, // Temper chips (mono)
  titleBig: 44, // major node titles
  titleMed: 24, // secondary node titles (Modal / TensorLake)
  quote: 26, // human card
  label: 24, // arrow stamp labels — all the same size everywhere
} as const;

// Darker "muted" for eyebrow labels — the default muted grey was too
// faint to read at poster scale.
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
}: {
  x: number;
  y1: number;
  y2: number;
  color?: string;
  label?: string;
  labelColor?: string;
  labelOffsetX?: number;
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
          y2={h - 9}
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <polyline
          points={`4,${h - 9} 10,${h - 1} 16,${h - 9}`}
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <div
          style={{
            position: "absolute",
            left: x + labelOffsetX,
            top: y1 + h / 2 - 14,
          }}
        >
          <Stamp color={labelColor ?? color}>{label}</Stamp>
        </div>
      )}
    </>
  );
}

// Straight horizontal connector with optional stamp label above/below.
function HArrow({
  x1,
  x2,
  y,
  color = C.ink,
  label,
  labelColor,
  labelSize,
  labelYOffset = -32,
  direction = "right" as "right" | "left",
}: {
  x1: number;
  x2: number;
  y: number;
  color?: string;
  label?: string;
  labelColor?: string;
  labelSize?: number;
  labelYOffset?: number;
  direction?: "right" | "left";
}) {
  const w = x2 - x1;
  const right = direction === "right";
  return (
    <>
      <svg
        style={{
          position: "absolute",
          left: x1,
          top: y - 10,
          width: w,
          height: 20,
          overflow: "visible",
        }}
      >
        <line
          x1={right ? "2" : String(w - 2)}
          y1="10"
          x2={right ? String(w - 9) : "9"}
          y2="10"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <polyline
          points={
            right
              ? `${w - 9},4 ${w - 1},10 ${w - 9},16`
              : `9,4 1,10 9,16`
          }
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && (
        <div
          style={{
            position: "absolute",
            left: x1 + w / 2,
            transform: "translateX(-50%)",
            top: y + labelYOffset,
          }}
        >
          <Stamp color={labelColor ?? color} size={labelSize}>
            {label}
          </Stamp>
        </div>
      )}
    </>
  );
}

// ── Poster ────────────────────────────────────────────────────────
export default function SystemDiagramPoster() {
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

  // Bullet rows use Nunito sans — mono was hurting legibility at poster
  // size, especially for longer phrases.
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

  return (
    <div
      className="w-[1350px] h-[1500px]"
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

      {/* Canvas-corner washi tapes — the only scrapbook flourish */}
      <WashiTape x={-20} y={40} w={180} h={22} rotate={-6} color={C.sakura} />
      <WashiTape
        x={1200}
        y={1440}
        w={180}
        h={22}
        rotate={-5}
        color={C.yuzu}
      />

      {/* ─────── HUMAN ─────── */}
      <Card x={475} y={70} w={400} h={140} tint={C.teal}>
        <div style={eyebrow}>human</div>
        <div
          style={{
            ...title,
            fontSize: T.quote,
            fontWeight: 600,
            fontStyle: "italic",
            marginTop: 14,
            lineHeight: 1.25,
          }}
        >
          &ldquo;research sci-fi × editorial typography&rdquo;
        </div>
      </Card>

      {/* asks ↓ */}
      <VArrow
        x={675}
        y1={220}
        y2={290}
        color={C.sumire}
        label="asks"
        labelColor={C.sumire}
      />

      {/* ─────── ANY AGENT ─────── */}
      <Card x={455} y={300} w={440} h={120} tint={C.sumire}>
        <div style={eyebrow}>any agent</div>
        <div
          style={{
            ...title,
            fontSize: 30,
            marginTop: 10,
          }}
        >
          uses Katagami as a tool
        </div>
      </Card>

      {/* submits CurationJob ↓ */}
      <VArrow
        x={675}
        y1={430}
        y2={505}
        color={C.beni}
        label="submits curationjob"
        labelColor={C.beni}
      />

      {/* ─────── KATAGAMI ─────── */}
      <Card x={80} y={515} w={360} h={300} tint={C.sakura}>
        <div style={eyebrow}>app layer · curation</div>
        <div style={{ ...title, fontSize: T.titleBig, marginTop: 4 }}>
          Katagami
        </div>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {[
            ["CurationJob", C.beni],
            ["DesignLanguage", C.sakura],
            ["Taxonomy", C.matcha],
          ].map(([n, col]) =>
            bulletRow(
              n as string,
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: col as string,
                  boxShadow: "0 1px 0 rgba(30,35,45,0.08)",
                }}
              />,
              n as string,
            ),
          )}
        </div>
      </Card>

      {/* ─────── TEMPERPAW ─────── */}
      <Card x={710} y={515} w={360} h={300} tint={C.matcha}>
        <div style={eyebrow}>agent runtime</div>
        <div style={{ ...title, fontSize: T.titleBig, marginTop: 4 }}>
          TemperPaw
        </div>
        <div
          style={{
            marginTop: 22,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {[
            ["scans the web", C.teal],
            ["synthesizes directions", C.ramune],
            ["writes via .action()", C.sumire],
          ].map(([n, col]) =>
            bulletRow(
              n as string,
              <span
                style={{
                  color: col as string,
                  fontWeight: 800,
                  fontSize: T.body,
                  lineHeight: 1,
                }}
              >
                ▸
              </span>,
              n as string,
            ),
          )}
        </div>
      </Card>

      {/* ─────── MODAL SANDBOX ─────── */}
      <Card x={1100} y={525} w={170} h={118} tint={C.yuzu} padding="20px 16px">
        <div style={eyebrow}>sandbox</div>
        <div
          style={{
            ...title,
            fontSize: T.titleMed,
            marginTop: 12,
            lineHeight: 1.05,
          }}
        >
          Modal
        </div>
      </Card>

      {/* "and" connector between the two sandboxes */}
      <div
        style={{
          position: "absolute",
          left: 1165,
          top: 652,
          fontFamily: FONT_DISPLAY,
          fontSize: 22,
          fontStyle: "italic",
          fontWeight: 600,
          color: C.sumire,
          lineHeight: 1,
          letterSpacing: "-0.01em",
        }}
      >
        and
      </div>

      {/* ─────── TENSORLAKE SANDBOX ─────── */}
      <Card x={1100} y={697} w={170} h={118} tint={C.sakura} padding="20px 16px">
        <div style={eyebrow}>sandbox</div>
        <div
          style={{
            ...title,
            fontSize: T.titleMed,
            marginTop: 12,
            lineHeight: 1.05,
          }}
        >
          TensorLake
        </div>
      </Card>

      {/* Katagami ↔ TemperPaw — labels now live entirely inside the 270-px
          gap between the two cards, centered on the arrow line. No bullet
          overlap anywhere. */}
      <HArrow
        x1={442}
        x2={708}
        y={640}
        color={C.teal}
        label="triggers agent"
        labelColor={C.teal}
        labelYOffset={-17}
        direction="right"
      />
      <HArrow
        x1={442}
        x2={708}
        y={700}
        color={C.sakura}
        label="writes back"
        labelColor={C.sakura}
        labelYOffset={-17}
        direction="left"
      />
      {/* TemperPaw → sandboxes */}
      <HArrow x1={1072} x2={1102} y={580} color={C.yuzu} direction="right" />
      <HArrow x1={1072} x2={1102} y={755} color={C.ramune} direction="right" />

      {/* Convergence → Temper */}
      <VArrow x={260} y1={825} y2={920} color={C.matcha} />
      <VArrow x={890} y1={825} y2={920} color={C.ramune} />

      {/* ─────── TEMPER ─────── */}
      <Card x={80} y={930} w={1190} h={185} tint={C.sumire}>
        <div style={eyebrow}>platform · governed runtime</div>
        <div style={{ ...title, fontSize: 48, marginTop: 2 }}>Temper</div>
        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          {[
            ["state machines", C.sumire],
            ["files", C.teal],
            ["auth", C.beni],
          ].map(([n, col]) => (
            <span
              key={n as string}
              style={{
                padding: "9px 16px",
                border: `1.6px dashed ${col}`,
                background: `color-mix(in oklch, ${col} 8%, white)`,
                borderRadius: 3,
                fontFamily: FONT_MONO,
                fontSize: T.chip,
                fontWeight: 700,
                color: C.ink,
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </Card>

      {/* Temper → Railway (deploy) / Turso (db) / Cloudflare (R2) /
          Datadog (observability) — four infrastructure dependencies/outputs. */}
      <VArrow
        x={190}
        y1={1125}
        y2={1220}
        color={C.sakura}
        label="deploy"
        labelColor={C.sakura}
      />
      <VArrow
        x={513}
        y1={1125}
        y2={1220}
        color={C.teal}
        label="db"
        labelColor={C.teal}
      />
      <VArrow
        x={836}
        y1={1125}
        y2={1220}
        color={C.ramune}
        label="R2"
        labelColor={C.ramune}
      />
      <VArrow
        x={1159}
        y1={1125}
        y2={1220}
        color={C.salad}
        label="observability"
        labelColor={C.matcha}
      />

      {/* ─────── RAILWAY ─────── */}
      <Card
        x={80}
        y={1230}
        w={220}
        h={88}
        tint={C.sakura}
        padding="20px 24px"
      >
        <div style={{ ...title, fontSize: 30 }}>Railway</div>
      </Card>

      {/* ─────── TURSO ─────── */}
      <Card
        x={403}
        y={1230}
        w={220}
        h={88}
        tint={C.teal}
        padding="20px 24px"
      >
        <div style={{ ...title, fontSize: 30 }}>Turso</div>
      </Card>

      {/* ─────── CLOUDFLARE ─────── */}
      <Card
        x={726}
        y={1230}
        w={220}
        h={88}
        tint={C.ramune}
        padding="20px 24px"
      >
        <div style={{ ...title, fontSize: 30 }}>Cloudflare</div>
      </Card>

      {/* ─────── DATADOG ─────── */}
      <Card
        x={1049}
        y={1230}
        w={220}
        h={88}
        tint={C.salad}
        padding="20px 24px"
      >
        <div style={{ ...title, fontSize: 30 }}>Datadog</div>
      </Card>
    </div>
  );
}
