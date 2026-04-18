/**
 * Katagami — System Diagram (scrapbook, diagram-only)
 *
 * Human → Any agent → (Katagami ⇄ OpenPaw → Modal Sandbox) → Temper → Datadog.
 * Styled to match the Katagami front-page: Bricolage / Nunito / Geist Mono,
 * translucent sticker cards (no borders) with palette tints + top ribbons,
 * washi tape corners, colorful squiggly arrows, stamps, dot-grid paper.
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

type Tint = keyof typeof C;

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

// Sticker card — matches the front-page sticker-card / "what you can do"
// cards: translucent-white with palette tint, NO border, soft shadow,
// thin colored top ribbon, optional washi tape corner and index sticker.
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
      {/* thin top ribbon — card identity */}
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
      {/* washi tape corner */}
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
      <div style={{ padding: "20px 22px", height: "100%" }}>{children}</div>
    </div>
  );
}

// Squiggly vertical arrow — hand-drawn wavy path, colorful.
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
  // 3 waves: Q + T + T + T, alternating amplitude via the first Q
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

// Squiggly horizontal arrow.
function HArrow({
  x1,
  x2,
  y,
  color = C.ink,
  amp = 8,
  label,
  labelColor,
  labelYOffset = -22,
  direction = "right" as "right" | "left",
}: {
  x1: number;
  x2: number;
  y: number;
  color?: string;
  amp?: number;
  label?: string;
  labelColor?: string;
  labelYOffset?: number;
  direction?: "right" | "left";
}) {
  const w = x2 - x1;
  const cy = 10;
  const right = direction === "right";
  const path = right
    ? `M 2 ${cy} Q ${w * 0.2} ${cy - amp} ${w * 0.33} ${cy} T ${w * 0.66} ${cy} T ${
        w - 10
      } ${cy}`
    : `M ${w - 2} ${cy} Q ${w * 0.8} ${cy - amp} ${w * 0.66} ${cy} T ${w * 0.33} ${
        cy
      } T 10 ${cy}`;
  const head = right
    ? `M ${w - 10} ${cy - 6} L ${w - 1} ${cy} L ${w - 10} ${cy + 6}`
    : `M 10 ${cy - 6} L 1 ${cy} L 10 ${cy + 6}`;
  return (
    <>
      <svg
        style={{
          position: "absolute",
          left: x1,
          top: y - cy,
          width: w,
          height: 20,
          overflow: "visible",
        }}
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d={head}
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
            left: x1 + w / 2,
            transform: "translateX(-50%)",
            top: y + labelYOffset,
          }}
        >
          <Stamp color={labelColor ?? color} rotate={-2}>
            {label}
          </Stamp>
        </div>
      )}
    </>
  );
}

// Small round index / badge sticker, optionally numbered.
function IndexBadge({
  x,
  y,
  tint,
  children,
  rotate = 6,
}: {
  x: number;
  y: number;
  tint: string;
  children: React.ReactNode;
  rotate?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 30,
        height: 30,
        borderRadius: 999,
        background: "white",
        border: `1.5px solid ${tint}`,
        color: `color-mix(in oklch, ${tint}, black 30%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT_MONO,
        fontSize: 11,
        fontWeight: 800,
        transform: `rotate(${rotate}deg)`,
        boxShadow: "1px 1px 0 rgba(30,35,45,0.10)",
        zIndex: 3,
      }}
    >
      {children}
    </div>
  );
}

// ── Poster ────────────────────────────────────────────────────────
export default function SystemDiagramPoster() {
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
        gap: 12,
        fontFamily: FONT_MONO,
        fontSize: 14,
        color: C.ink,
      }}
    >
      {glyph}
      {label}
    </div>
  );

  return (
    <div
      className="w-[1200px] h-[1500px]"
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

      {/* ─────── HUMAN ─────── */}
      <Card
        x={420}
        y={60}
        w={360}
        h={120}
        tint={C.teal}
        rotate={-1}
        tape={C.sakura}
        tapeRot={-6}
        tapePos="tl"
      >
        <div style={eyebrow}>human</div>
        <div
          style={{
            ...title,
            fontSize: 20,
            fontWeight: 600,
            fontStyle: "italic",
            marginTop: 10,
            lineHeight: 1.2,
          }}
        >
          &ldquo;research sci-fi × editorial typography&rdquo;
        </div>
      </Card>

      {/* asks ↓ */}
      <VArrow
        x={600}
        y1={185}
        y2={260}
        color={C.sumire}
        label="asks"
        labelColor={C.sumire}
      />

      {/* ─────── ANY AGENT ─────── */}
      <Card
        x={380}
        y={270}
        w={440}
        h={120}
        tint={C.sumire}
        rotate={0.8}
        tape={C.yuzu}
        tapeRot={5}
        tapePos="tr"
      >
        <div style={eyebrow}>any agent</div>
        <div
          style={{
            ...title,
            fontSize: 28,
            fontWeight: 800,
            marginTop: 6,
          }}
        >
          uses Katagami as a tool
        </div>
        <div style={{ marginTop: 10 }}>
          <Stamp color={C.teal} rotate={-3}>
            tool user
          </Stamp>
        </div>
      </Card>

      {/* submits CurationJob ↓ */}
      <VArrow
        x={600}
        y1={395}
        y2={470}
        color={C.beni}
        label="submits CurationJob"
        labelColor={C.beni}
      />

      {/* ─────── KATAGAMI ─────── */}
      <Card
        x={70}
        y={480}
        w={460}
        h={320}
        tint={C.sakura}
        rotate={-0.6}
        tape={C.yuzu}
        tapeRot={-7}
        tapePos="tl"
      >
        <IndexBadge x={420} y={-10} tint={C.sakura} rotate={8}>
          ◆
        </IndexBadge>
        <div style={eyebrow}>app layer · curation</div>
        <div style={{ ...title, fontSize: 40, marginTop: 2 }}>Katagami</div>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {[
            ["CurationJob", C.beni],
            ["DesignLanguage", C.sakura],
            ["DesignSource", C.yuzu],
            ["Taxonomy", C.matcha],
          ].map(([n, col]) =>
            bulletRow(
              n as string,
              <span
                style={{
                  width: 10,
                  height: 10,
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

      {/* ─────── OPENPAW ─────── */}
      <Card
        x={600}
        y={480}
        w={460}
        h={320}
        tint={C.matcha}
        rotate={0.7}
        tape={C.sumire}
        tapeRot={6}
        tapePos="tr"
      >
        <IndexBadge x={-10} y={-10} tint={C.matcha} rotate={-8}>
          ✦
        </IndexBadge>
        <div style={eyebrow}>runtime · opus</div>
        <div style={{ ...title, fontSize: 40, marginTop: 2 }}>OpenPaw</div>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {[
            ["scans the web", C.teal],
            ["pulls directions", C.ramune],
            ["fans out", C.sumire],
            ["writes via .action()", C.beni],
          ].map(([n, col]) =>
            bulletRow(
              n as string,
              <span
                style={{
                  color: col as string,
                  fontWeight: 800,
                  fontSize: 15,
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
      <Card
        x={1080}
        y={555}
        w={110}
        h={110}
        tint={C.yuzu}
        rotate={3}
        tape={C.teal}
        tapeRot={-10}
        tapePos="tl"
      >
        <div style={{ ...eyebrow, fontSize: 9 }}>runtime</div>
        <div
          style={{
            ...title,
            fontSize: 19,
            marginTop: 6,
            lineHeight: 1.05,
          }}
        >
          Modal
          <br />
          Sandbox
        </div>
      </Card>

      {/* Katagami → OpenPaw: triggers agent */}
      <HArrow
        x1={536}
        x2={596}
        y={565}
        color={C.teal}
        label="triggers agent"
        labelColor={C.teal}
        labelYOffset={-30}
        direction="right"
      />
      {/* OpenPaw → Katagami: writes back */}
      <HArrow
        x1={536}
        x2={596}
        y={715}
        color={C.sakura}
        label="writes back"
        labelColor={C.sakura}
        labelYOffset={14}
        direction="left"
      />
      {/* OpenPaw → Modal Sandbox */}
      <HArrow x1={1062} x2={1082} y={590} color={C.yuzu} direction="right" />

      {/* ↓ convergence to Temper */}
      <VArrow x={295} y1={810} y2={905} color={C.matcha} amp={9} />
      <VArrow x={830} y1={810} y2={905} color={C.ramune} amp={9} />

      {/* ─────── TEMPER ─────── */}
      <Card
        x={70}
        y={915}
        w={1060}
        h={180}
        tint={C.sumire}
        rotate={-0.3}
        tape={C.sakura}
        tapeRot={-3}
        tapePos="tl"
      >
        <IndexBadge x={1010} y={-12} tint={C.sumire} rotate={6}>
          ✦
        </IndexBadge>
        <div style={eyebrow}>platform · governed runtime</div>
        <div style={{ ...title, fontSize: 46, marginTop: 0 }}>Temper</div>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          {[
            ["state machines", C.sumire],
            ["files", C.teal],
            ["auth (Cedar)", C.beni],
            ["WASM", C.matcha],
          ].map(([n, col]) => (
            <span
              key={n as string}
              style={{
                padding: "6px 14px",
                border: `1.5px dashed ${col}`,
                background: `color-mix(in oklch, ${col} 8%, white)`,
                borderRadius: 3,
                fontFamily: FONT_MONO,
                fontSize: 13,
                fontWeight: 600,
                color: C.ink,
              }}
            >
              {n}
            </span>
          ))}
        </div>
      </Card>

      {/* Temper → Datadog */}
      <VArrow
        x={600}
        y1={1105}
        y2={1200}
        color={C.salad}
        label="traces · metrics"
        labelColor={C.matcha}
      />

      {/* ─────── DATADOG ─────── */}
      <Card
        x={450}
        y={1210}
        w={300}
        h={150}
        tint={C.salad}
        rotate={1.5}
        tape={C.sumire}
        tapeRot={4}
        tapePos="tr"
      >
        <div style={eyebrow}>observability</div>
        <div style={{ ...title, fontSize: 32, marginTop: 4 }}>Datadog</div>
        <div
          style={{
            marginTop: 8,
            fontFamily: FONT_MONO,
            fontSize: 13,
            color: C.muted,
          }}
        >
          traces · metrics
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <Stamp color={C.matcha}>live</Stamp>
          <Stamp color={C.teal} rotate={3}>
            trace
          </Stamp>
        </div>
      </Card>

      {/* Scrapbook flourishes */}
      <Sparkle x={48} y={70} size={13} color={C.sumire} rotate={-15} />
      <Sparkle x={1140} y={100} size={15} color={C.teal} rotate={10} />
      <Sparkle x={58} y={850} size={11} color={C.beni} rotate={22} />
      <Sparkle x={1145} y={880} size={12} color={C.matcha} rotate={-10} />
      <Sparkle x={50} y={1200} size={10} color={C.yuzu} rotate={14} />
      <Sparkle x={1150} y={1290} size={13} color={C.sakura} rotate={-12} />
      <Sparkle x={760} y={1430} size={14} color={C.sumire} rotate={10} />
      <Sparkle x={240} y={1430} size={11} color={C.ramune} rotate={-5} />

      {/* Small washi strips in empty areas */}
      <WashiTape
        x={40}
        y={1420}
        w={170}
        h={18}
        rotate={4}
        color={C.yuzu}
      />
      <WashiTape
        x={990}
        y={1410}
        w={150}
        h={16}
        rotate={-5}
        color={C.sakura}
      />
    </div>
  );
}
