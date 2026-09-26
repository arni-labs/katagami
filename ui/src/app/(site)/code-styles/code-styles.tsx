"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The styles are plain ES modules served from /code-styles, so the page loads them the way any
// other site would. The bundler must not try to resolve these URLs.
const BASE = "/code-styles";
const importUrl = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;

type Param = {
  type: "number" | "colour" | "choice";
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: (string | number)[];
  label: string;
};
type Stage = { id: string; label: string; share: number };
type Rule = { id: string; text: string; source: string };
type Check = { id: string; pass: boolean; detail: string };
type Meta = {
  id: string;
  name: string;
  version: string;
  creator: { name: string; handle?: string };
  licence: string;
  medium: string;
  tradition: { cell: string; name: string }[];
  parents: string[];
  summary: string;
};
type StyleModule = {
  meta: Meta;
  params: Record<string, Param>;
  stages: Stage[];
  rules: Rule[];
};
type PlayerState = {
  seed: number;
  params: Record<string, string | number>;
  t: number;
  checks: Check[];
  plan: { stages?: Stage[] } | null;
};
type Player = {
  state: PlayerState;
  on(ev: "stage" | "frame" | "ready" | "done", f: (v: unknown) => void): Player;
  play(): Player;
  pause(): Player;
  seek(t: number): Player;
  hold(): Player;
  restart(next: { seed?: number; params?: Record<string, string | number>; subject?: Subject; autoplay?: boolean; at?: number }): Promise<Player>;
  destroy(): void;
};
type Subject = { svg?: string; text?: string; name?: string };
type Mount = (
  el: HTMLCanvasElement,
  style: StyleModule,
  opts: { subject: Subject; seed?: number; params?: Record<string, string | number>; autoplay?: boolean; at?: number; pixels?: number; interactive?: boolean },
) => Promise<Player>;
type SubjectEntry = { id: string; name: string };

let runtime: Promise<{ mount: Mount }> | null = null;
const loadRuntime = () => (runtime ??= importUrl(`${BASE}/runtime/player.js`) as Promise<{ mount: Mount }>);
const styleCache = new Map<string, Promise<StyleModule>>();
const loadStyle = (id: string) => {
  if (!styleCache.has(id)) styleCache.set(id, importUrl(`${BASE}/styles/${id}/style.js`) as Promise<StyleModule>);
  return styleCache.get(id)!;
};
const svgCache = new Map<string, Promise<string>>();
const loadSvg = (id: string) => {
  if (!svgCache.has(id)) svgCache.set(id, fetch(`${BASE}/subjects/${id}.svg`).then((r) => r.text()));
  return svgCache.get(id)!;
};

const label = "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground";
const chipBase = "font-mono text-[12px] uppercase tracking-[0.12em] px-3 py-2 transition-colors shadow-[var(--shadow-card)]";
const chip = `${chipBase} bg-[var(--washi)] hover:bg-muted`;
const chipOn = `${chipBase} bg-[var(--sumi)] text-[var(--washi)]`;
// a highlighter swipe marks what is chosen; the site draws no borders
const picked = "bg-[color-mix(in_oklch,var(--yuzu)_38%,var(--washi))]";

export function CodeStyles() {
  const [styles, setStyles] = useState<StyleModule[]>([]);
  const [subjects, setSubjects] = useState<SubjectEntry[]>([]);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [subjectKey, setSubjectKey] = useState<string>("cat");
  const [custom, setCustom] = useState<Subject | null>(null);
  const [words, setWords] = useState("");
  const [params, setParams] = useState<Record<string, string | number>>({});
  const [seed, setSeed] = useState(1);
  const [stages, setStages] = useState<Stage[]>([]);
  const [stage, setStage] = useState<string>("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<Player | null>(null);
  const needleRef = useRef<HTMLSpanElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [ids, subs] = await Promise.all([
        fetch(`${BASE}/styles/index.json`).then((r) => r.json() as Promise<string[]>),
        fetch(`${BASE}/subjects/index.json`).then((r) => (r.ok ? (r.json() as Promise<SubjectEntry[]>) : [{ id: "cat", name: "Cat" }])),
      ]);
      const loaded = await Promise.all(ids.map((id) => loadStyle(id).catch(() => null)));
      const ok = loaded.filter((s): s is StyleModule => !!s);
      setStyles(ok);
      setSubjects(subs);
      setStyleId((cur) => cur ?? ok[0]?.meta.id ?? null);
    })();
  }, []);

  const style = styles.find((s) => s.meta.id === styleId) ?? null;

  const subjectFor = useCallback(async (): Promise<Subject> => {
    if (subjectKey === "words" || subjectKey === "upload") return custom ?? { text: "katagami" };
    return { svg: await loadSvg(subjectKey), name: subjectKey };
  }, [subjectKey, custom]);

  // mount the chosen style on the studio canvas whenever the style or subject changes
  useEffect(() => {
    if (!style || !canvasRef.current) return;
    let alive = true;
    const initial: Record<string, string | number> = {};
    for (const [k, p] of Object.entries(style.params)) initial[k] = p.default;
    setParams(initial);
    setBusy(true);
    (async () => {
      const { mount } = await loadRuntime();
      const subject = await subjectFor();
      if (!alive || !canvasRef.current) return;
      playerRef.current?.destroy();
      const player = await mount(canvasRef.current, style, { subject, seed, params: initial, pixels: 720 });
      if (!alive) {
        player.destroy();
        return;
      }
      playerRef.current = player;
      const sync = () => {
        setParams({ ...player.state.params });
        setSeed(player.state.seed);
        setStages(player.state.plan?.stages ?? style.stages);
        setChecks(player.state.checks);
        setBusy(false);
      };
      sync();
      player
        .on("ready", sync)
        .on("stage", (s) => setStage((s as Stage).label))
        .on("frame", (t) => {
          if (needleRef.current) needleRef.current.style.left = `${(t as number) * 100}%`;
          sliderRef.current?.setAttribute("aria-valuenow", (t as number).toFixed(2));
        })
        .on("done", () => setStage("Finished. Move the pointer over it, or click."));
    })();
    return () => {
      alive = false;
    };
    // seed is applied through restart below; remounting on seed change would reset the params
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, subjectFor]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  const restart = async (next: { seed?: number; params?: Record<string, string | number> }) => {
    const player = playerRef.current;
    if (!player) return;
    setBusy(true);
    await player.restart(next);
  };

  const setParam = (k: string, v: string | number) => {
    const next = { ...params, [k]: v };
    setParams(next);
    restart({ params: next });
  };

  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === "pointermove" && e.buttons !== 1) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const player = playerRef.current;
    if (!player) return;
    player.seek(t);
    if (needleRef.current) needleRef.current.style.left = `${t * 100}%`;
  };

  const download = () => {
    const c = canvasRef.current;
    if (!c || !style) return;
    const a = document.createElement("a");
    a.download = `${style.meta.id}-${subjectKey}-${seed}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  };

  // Record the whole making plus a moment of the finished piece, straight from the canvas.
  const record = async () => {
    const c = canvasRef.current;
    const player = playerRef.current;
    if (!c || !player || !style || recording) return;
    const type = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    if (!type) return;
    setRecording(true);
    const rec = new MediaRecorder(c.captureStream(60), { mimeType: type, videoBitsPerSecond: 12_000_000 });
    const parts: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));
    let done = false;
    player.on("done", () => {
      if (done) return;
      done = true;
      setTimeout(() => rec.state === "recording" && rec.stop(), 1800);
    });
    rec.start();
    await player.restart({});
    await stopped;
    const a = document.createElement("a");
    a.download = `${style.meta.id}-${subjectKey}-${seed}.${type.startsWith("video/mp4") ? "mp4" : "webm"}`;
    a.href = URL.createObjectURL(new Blob(parts, { type }));
    a.click();
    setRecording(false);
  };

  const embed = style
    ? `<script type="module" src="https://katagami.ai${BASE}/runtime/element.js"></script>\n<katagami-draw style="${style.meta.id}" ${
        subjectKey === "words" ? `text="${words || "katagami"}"` : `subject="${subjectKey === "upload" ? "your.svg" : subjectKey}"`
      } seed="${seed}"${
        Object.keys(params).some((k) => params[k] !== style.params[k]?.default)
          ? ` params='${JSON.stringify(Object.fromEntries(Object.entries(params).filter(([k, v]) => v !== style.params[k]?.default)))}'`
          : ""
      }></katagami-draw>`
    : "";

  const pickSubject = (key: string) => {
    setCustom(null);
    setSubjectKey(key);
  };

  const openFromMatrix = (sid: string, sub: string) => {
    setCustom(null);
    setSubjectKey(sub);
    setStyleId(sid);
    studioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-10">
      {/* style picker */}
      <div className="flex flex-wrap gap-3">
        {styles.map((s) => (
          <button
            key={s.meta.id}
            type="button"
            onClick={() => setStyleId(s.meta.id)}
            className={`sticker-card px-5 py-4 text-left ${s.meta.id === styleId ? picked : ""}`}
          >
            <div className="font-display text-[22px] font-semibold tracking-[-0.02em]">{s.meta.name}</div>
            <div className={label}>{s.meta.tradition.map((t) => t.name).join(" · ")}</div>
          </button>
        ))}
      </div>

      <div ref={studioRef} className="mt-8 grid scroll-mt-24 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* the piece */}
        <div className="min-w-0">
          <div className="relative bg-[var(--washi)] shadow-[var(--shadow-card)]">
            <canvas ref={canvasRef} className="block aspect-square w-full" aria-label={style ? `${style.meta.name}: ${style.meta.summary}` : "code style"} />
            {busy && (
              <span className={`absolute left-4 top-4 bg-[var(--washi)] px-2 py-1 ${label}`}>Preparing</span>
            )}
          </div>

          {/* the making, as a timeline you can scrub */}
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className={label}>The making</span>
              <span className="text-[15px]">{stage}</span>
            </div>
            <div
              className="relative mt-2 flex h-9 cursor-ew-resize select-none"
              onPointerDown={scrub}
              onPointerMove={scrub}
              role="slider"
              aria-label="Scrub through the making"
              ref={sliderRef}
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={0}
            >
              {stages.map((s, i) => (
                <div
                  key={s.id}
                  className="relative flex items-center overflow-hidden px-2 text-[11px] font-mono uppercase tracking-[0.08em]"
                  style={{
                    flex: `${s.share} 1 0`,
                    background: i % 2 ? "color-mix(in oklch, var(--ramune) 14%, var(--washi))" : "color-mix(in oklch, var(--yuzu) 22%, var(--washi))",
                  }}
                  title={s.label}
                >
                  <span className="truncate">{s.label}</span>
                </div>
              ))}
              <span ref={needleRef} className="pointer-events-none absolute -bottom-1 -top-1 w-[3px] bg-[var(--sakura)]" style={{ left: "0%" }} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={chip} onClick={() => restart({})}>
              Make it again
            </button>
            <button type="button" className={chip} onClick={() => playerRef.current?.hold()}>
              Skip to the end
            </button>
            <button type="button" className={chip} onClick={download}>
              Save the picture
            </button>
            <button type="button" className={recording ? chipOn : chip} onClick={record} disabled={recording}>
              {recording ? "Recording the making" : "Record the making"}
            </button>
          </div>
        </div>

        {/* controls */}
        <aside className="flex min-w-0 flex-col gap-7 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {style && (
            <section>
              <div className={label}>About</div>
              <p className="mt-2 text-[16px] leading-relaxed">{style.meta.summary}</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[14.5px]">
                <dt className="text-muted-foreground">Made by</dt>
                <dd>
                  {style.meta.creator.name}
                  {style.meta.creator.handle ? ` (${style.meta.creator.handle})` : ""}
                </dd>
                <dt className="text-muted-foreground">Tradition</dt>
                <dd>{style.meta.tradition.map((t) => t.name).join(", ")}</dd>
                <dt className="text-muted-foreground">Lineage</dt>
                <dd>{style.meta.parents.length ? style.meta.parents.join(", ") : "Original"}</dd>
                <dt className="text-muted-foreground">Licence</dt>
                <dd>
                  {style.meta.licence} · v{style.meta.version}
                </dd>
              </dl>
              <a className="mt-3 inline-block text-[14.5px] underline underline-offset-4" href={`${BASE}/styles/${style.meta.id}/RECIPE.md`}>
                Read the recipe
              </a>
            </section>
          )}

          <section>
            <div className={label}>Subject</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickSubject(s.id)}
                  className={`flex flex-col items-center gap-1 p-2 shadow-[var(--shadow-card)] ${subjectKey === s.id ? picked : "bg-[var(--washi)]"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${BASE}/subjects/${s.id}.svg`} alt="" className="aspect-square w-full" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em]">{s.name}</span>
                </button>
              ))}
            </div>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!words.trim()) return;
                setCustom({ text: words.trim(), name: words.trim() });
                setSubjectKey("words");
              }}
            >
              <input
                value={words}
                onChange={(e) => setWords(e.target.value)}
                maxLength={24}
                placeholder="Your words"
                className="min-w-0 flex-1 bg-[var(--washi)] px-3 py-2 text-[16px] shadow-[var(--shadow-card)] outline-none"
              />
              <button type="submit" className={chip}>
                Draw
              </button>
            </form>
            <label className={`${chip} mt-2 inline-block cursor-pointer`}>
              Your own SVG
              <input
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setCustom({ svg: await f.text(), name: f.name });
                  setSubjectKey("upload");
                }}
              />
            </label>
          </section>

          {style && (
            <section>
              <div className={label}>Settings</div>
              <div className="mt-2 flex flex-col gap-4">
                {Object.entries(style.params).map(([k, p]) => (
                  <ParamControl key={k} name={k} param={p} value={params[k] ?? p.default} onChange={(v) => setParam(k, v)} />
                ))}
                <div>
                  <div className="text-[14.5px]">Seed</div>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value) || 1)}
                      onBlur={() => restart({ seed })}
                      className="w-28 bg-[var(--washi)] px-3 py-2 text-[16px] shadow-[var(--shadow-card)] outline-none"
                    />
                    <button
                      type="button"
                      className={chip}
                      onClick={() => {
                        const s = 1 + Math.floor(Math.random() * 9999);
                        setSeed(s);
                        restart({ seed: s });
                      }}
                    >
                      Another
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

        </aside>

        <div className="grid min-w-0 gap-8 md:grid-cols-2 lg:col-start-1">
          {style && (
            <section>
              <div className={label}>Rules it keeps</div>
              <ul className="mt-2 flex flex-col gap-3">
                {style.rules.map((r) => {
                  const c = checks.find((x) => x.id === r.id);
                  return (
                    <li key={r.id} className="text-[14.5px] leading-snug">
                      <span
                        className="mr-2 inline-block px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em]"
                        style={{
                          background: c == null ? "var(--muted)" : c.pass ? "color-mix(in oklch, var(--ramune) 22%, var(--washi))" : "color-mix(in oklch, var(--beni) 25%, var(--washi))",
                        }}
                      >
                        {c == null ? "…" : c.pass ? "Holds" : "Broken"}
                      </span>
                      {r.text}
                      {c && <span className="block text-muted-foreground">{c.detail}</span>}
                      <span className="block font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{r.source}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {style && (
            <section>
              <div className={label}>Use it in your page</div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-[var(--washi)] p-3 font-mono text-[12.5px] shadow-[var(--shadow-card)]">{embed}</pre>
              <button
                type="button"
                className={`${chip} mt-2`}
                onClick={async () => {
                  await navigator.clipboard.writeText(embed);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <a className="ml-4 text-[14.5px] underline underline-offset-4" href={`${BASE}/README.md`}>
                How styles work
              </a>
            </section>
          )}
          </div>
      </div>

      <Matrix styles={styles} subjects={subjects} onOpen={openFromMatrix} />
    </div>
  );
}

function ParamControl({
  name,
  param,
  value,
  onChange,
}: {
  name: string;
  param: Param;
  value: string | number;
  onChange: (v: string | number) => void;
}) {
  if (param.type === "number") {
    return (
      <label className="block">
        <span className="flex justify-between text-[14.5px]">
          {param.label}
          <span className="font-mono text-[12px] text-muted-foreground">{value}</span>
        </span>
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          defaultValue={value as number}
          onPointerUp={(e) => onChange(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => onChange(Number((e.target as HTMLInputElement).value))}
          className="mt-1 w-full accent-[var(--sakura)]"
          aria-label={param.label}
        />
      </label>
    );
  }
  if (param.type === "colour") {
    return (
      <div>
        <div className="text-[14.5px]">{param.label}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {(param.options ?? []).map((o) => (
            <button
              key={String(o)}
              type="button"
              aria-label={`${param.label} ${o}`}
              onClick={() => onChange(o)}
              className={`h-8 w-8 shadow-[var(--shadow-card)] ${value === o ? "outline outline-2 outline-offset-2 outline-[var(--sumi)]" : ""}`}
              style={{ background: String(o) }}
            />
          ))}
          <input
            type="color"
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer bg-transparent"
            aria-label={`${param.label}, any colour`}
            name={name}
          />
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[14.5px]">{param.label}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        {(param.options ?? []).map((o) => (
          <button key={String(o)} type="button" onClick={() => onChange(o)} className={value === o ? chipOn : chip}>
            {String(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

// Every style on every subject, drawn live, one cell at a time as it scrolls into view.
function Matrix({
  styles,
  subjects,
  onOpen,
}: {
  styles: StyleModule[];
  subjects: SubjectEntry[];
  onOpen: (styleId: string, subjectId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !styles.length || !subjects.length) return;
    const players: Player[] = [];
    let queue = Promise.resolve();
    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || seen.has(e.target)) continue;
          seen.add(e.target);
          const c = e.target as HTMLCanvasElement;
          queue = queue.then(async () => {
            const { mount } = await loadRuntime();
            const style = await loadStyle(c.dataset.style!);
            const svg = await loadSvg(c.dataset.subject!);
            const p = await mount(c, style, { subject: { svg, name: c.dataset.subject }, seed: 1, autoplay: false, at: 1, pixels: 320, interactive: false });
            players.push(p);
          });
        }
      },
      { rootMargin: "200px" },
    );
    root.querySelectorAll("canvas").forEach((c) => io.observe(c));
    return () => {
      io.disconnect();
      players.forEach((p) => p.destroy());
    };
  }, [styles, subjects]);

  if (!styles.length) return null;
  return (
    <section className="mt-20">
      <span aria-hidden className="sticker-perforation mb-8 block" />
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Every style, every subject</div>
      <h2 className="mt-2 font-display text-[32px] font-bold tracking-[-0.03em]">Same subjects, different hands</h2>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
        Each cell is drawn live in your browser by the style&apos;s own program, from the same six pictures. Open one to watch it being made.
      </p>
      <div ref={ref} className="mt-8 overflow-x-auto">
        <table className="w-full border-separate border-spacing-3">
          <thead>
            <tr>
              <th />
              {subjects.map((s) => (
                <th key={s.id} className="text-left font-mono text-[11px] font-normal uppercase tracking-[0.14em] text-muted-foreground">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {styles.map((st) => (
              <tr key={st.meta.id}>
                <th className="w-28 pr-2 text-left align-middle font-display text-[18px] font-semibold tracking-[-0.02em]">{st.meta.name}</th>
                {subjects.map((s) => (
                  <td key={s.id} className="min-w-[140px]">
                    <button
                      type="button"
                      onClick={() => onOpen(st.meta.id, s.id)}
                      className="block w-full bg-[var(--washi)] shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
                      aria-label={`${st.meta.name}, ${s.name}`}
                    >
                      <canvas data-style={st.meta.id} data-subject={s.id} className="block aspect-square w-full" />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
