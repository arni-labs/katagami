"use client";

import { useEffect, useRef } from "react";

/**
 * RisoHeroPress — the landing hero's print bed. Three stencil passes
 * (seigaiha waves, asanoha-ish star lattice, a halftone disc) overprint
 * each other in spot inks and drift gently apart on pointer move, like
 * sheets slipping on the drum. Pure SVG + transforms — no WebGL, one
 * rAF, parallax disabled for prefers-reduced-motion.
 */
export function RisoHeroPress({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<Array<SVGGElement | null>>([]);
  const frame = useRef<number>(0);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const scroll = { v: 0, t: 0 };
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      target.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      kick();
    };
    const readScroll = () => {
      // Clamp: the hero leaves the viewport after ~1 screen, so parallax
      // past that just wastes frames and flings shapes off.
      scroll.t = Math.min(1.4, window.scrollY / Math.max(1, window.innerHeight));
    };
    const onScroll = () => {
      readScroll();
      kick();
    };
    const kick = () => {
      if (!frame.current) frame.current = requestAnimationFrame(tick);
    };

    // Each pass slips at its own rate — pointer (x/y) and scroll (y) both
    // feed the same misregistration you can feel.
    const pRates = [16, -11, 22, -24];
    const sRates = [34, -56, 22, -74];
    const tick = () => {
      frame.current = 0;
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      scroll.v += (scroll.t - scroll.v) * 0.1;
      layersRef.current.forEach((g, i) => {
        if (!g) return;
        const pr = pRates[i] ?? 8;
        const sr = sRates[i] ?? 30;
        const x = current.current.x * pr;
        const y = current.current.y * pr + scroll.v * sr;
        g.style.transform = `translate(${x}px, ${y}px)`;
      });
      const settled =
        Math.abs(target.current.x - current.current.x) < 0.002 &&
        Math.abs(target.current.y - current.current.y) < 0.002 &&
        Math.abs(scroll.t - scroll.v) < 0.0005;
      if (!settled) frame.current = requestAnimationFrame(tick);
    };

    readScroll();
    scroll.v = scroll.t;
    if (!coarse) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    kick();
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Wide viewBox matched to the hero band; the BIG stencil passes
          spread edge-to-edge. `xMidYMid slice` lets them fill the whole
          hero at scale — they're sized so the only thing ever trimmed is
          empty margin, never a stencil pass. */}
      <svg
        viewBox="0 0 1280 480"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        style={{ mixBlendMode: "var(--ink-blend)" as never }}
      >
        <defs>
          {/* Pattern content does NOT inherit currentColor from the shape
              that references it — ink each pattern explicitly. */}
          {/* seigaiha — overlapping wave crescents */}
          <pattern id="riso-seigaiha" width="80" height="40" patternUnits="userSpaceOnUse">
            <g fill="none" strokeWidth="5" style={{ stroke: "var(--sakura)" }}>
              <circle cx="40" cy="40" r="34" />
              <circle cx="40" cy="40" r="22" />
              <circle cx="40" cy="40" r="10" />
              <circle cx="0" cy="0" r="34" />
              <circle cx="0" cy="0" r="22" />
              <circle cx="80" cy="0" r="34" />
              <circle cx="80" cy="0" r="22" />
            </g>
          </pattern>
          {/* halftone dot screen */}
          <pattern id="riso-halftone" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="7" cy="7" r="3.1" style={{ fill: "var(--yuzu)" }} />
          </pattern>
          {/* asanoha-ish star lattice */}
          <pattern id="riso-asanoha" width="72" height="72" patternUnits="userSpaceOnUse">
            <g fill="none" strokeWidth="3.4" style={{ stroke: "var(--ramune)" }}>
              <path d="M36 0 L36 72 M0 36 L72 36 M0 0 L72 72 M72 0 L0 72" />
            </g>
          </pattern>
        </defs>

        {/* The whole cluster is anchored to the RIGHT half of the band so
            the headline on the left stays clean; pointer + scroll still
            drift the passes across a wider area. */}
        {/* pass 1 — sakura seigaiha, a big disc, right-of-centre */}
        <g
          ref={(el) => {
            layersRef.current[0] = el;
          }}
          style={{ willChange: "transform" }}
        >
          <circle
            cx="760"
            cy="250"
            r="270"
            fill="url(#riso-seigaiha)"
            style={{ color: "var(--sakura)" }}
            opacity="0.5"
          />
        </g>

        {/* pass 2 — ramune lattice, a large tilted rectangle on the right */}
        <g
          ref={(el) => {
            layersRef.current[1] = el;
          }}
          style={{ willChange: "transform" }}
        >
          <rect
            x="850"
            y="0"
            width="460"
            height="460"
            transform="rotate(8 1080 230)"
            fill="url(#riso-asanoha)"
            style={{ color: "var(--ramune)" }}
            opacity="0.42"
          />
        </g>

        {/* pass 3 — yuzu halftone disc, big, far right */}
        <g
          ref={(el) => {
            layersRef.current[2] = el;
          }}
          style={{ willChange: "transform" }}
        >
          <circle
            cx="1160"
            cy="250"
            r="280"
            fill="url(#riso-halftone)"
            style={{ color: "var(--yuzu)" }}
            opacity="0.68"
          />
        </g>

        {/* pass 4 — registration crosses, kept on the right interior so
            `slice` never trims them, however the hero is proportioned */}
        <g
          ref={(el) => {
            layersRef.current[3] = el;
          }}
          style={{ willChange: "transform", color: "var(--graphite)" }}
          opacity="0.45"
        >
          {[
            [720, 120],
            [1180, 130],
            [800, 390],
            [1110, 390],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} fill="none" stroke="currentColor" strokeWidth="2">
              <circle r="9" />
              <path d="M -16 0 H 16 M 0 -16 V 16" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
