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
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      target.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      if (!frame.current) frame.current = requestAnimationFrame(tick);
    };

    // Each pass slips at a different rate — misregistration you can feel.
    const rates = [10, -7, 14, -16];
    const tick = () => {
      frame.current = 0;
      current.current.x += (target.current.x - current.current.x) * 0.08;
      current.current.y += (target.current.y - current.current.y) * 0.08;
      layersRef.current.forEach((g, i) => {
        if (!g) return;
        const r = rates[i] ?? 8;
        g.style.transform = `translate(${current.current.x * r}px, ${current.current.y * r}px)`;
      });
      const settled =
        Math.abs(target.current.x - current.current.x) < 0.002 &&
        Math.abs(target.current.y - current.current.y) < 0.002;
      if (!settled) frame.current = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* viewBox tuned to a wide band; `meet` fits the WHOLE composition so
          no stencil pass is ever clipped. Every shape sits inside generous
          margins (≥40 from each edge) so it always spreads cleanly. */}
      <svg
        viewBox="0 0 1200 460"
        preserveAspectRatio="xMidYMid meet"
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

        {/* pass 1 — sakura seigaiha, left of the cluster */}
        <g
          ref={(el) => {
            layersRef.current[0] = el;
          }}
          style={{ willChange: "transform" }}
        >
          <circle
            cx="560"
            cy="220"
            r="150"
            fill="url(#riso-seigaiha)"
            style={{ color: "var(--sakura)" }}
            opacity="0.4"
          />
        </g>

        {/* pass 2 — ramune lattice, the tilted rectangle in the middle */}
        <g
          ref={(el) => {
            layersRef.current[1] = el;
          }}
          style={{ willChange: "transform" }}
        >
          <rect
            x="730"
            y="95"
            width="250"
            height="250"
            transform="rotate(8 855 220)"
            fill="url(#riso-asanoha)"
            style={{ color: "var(--ramune)" }}
            opacity="0.3"
          />
        </g>

        {/* pass 3 — yuzu halftone disc, right of the cluster */}
        <g
          ref={(el) => {
            layersRef.current[2] = el;
          }}
          style={{ willChange: "transform" }}
        >
          <circle
            cx="1010"
            cy="270"
            r="130"
            fill="url(#riso-halftone)"
            style={{ color: "var(--yuzu)" }}
            opacity="0.55"
          />
        </g>

        {/* pass 4 — registration crosses spread across the band */}
        <g
          ref={(el) => {
            layersRef.current[3] = el;
          }}
          style={{ willChange: "transform", color: "var(--graphite)" }}
          opacity="0.4"
        >
          {[
            [470, 90],
            [1130, 95],
            [600, 405],
            [1080, 400],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle r="7" />
              <path d="M -12 0 H 12 M 0 -12 V 12" />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
