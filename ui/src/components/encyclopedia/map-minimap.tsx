"use client";
import { memo, useEffect, useRef } from "react";
import type { GraphLayout } from "./graph-layout";
export const MiniField = memo(function MiniField({
  layout,
  width,
  height,
  s,
  ox,
  oy,
}: {
  layout: GraphLayout;
  width: number;
  height: number;
  s: number;
  ox: number;
  oy: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    c.width = width * 2;
    c.height = height * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = "#577085";
    ctx.globalAlpha = 0.45;
    for (const p of layout.plates)
      ctx.fillRect(
        ox + (p.x - p.w / 2) * s,
        oy + (p.y - p.h / 2) * s,
        Math.max(2, p.w * s),
        Math.max(2, p.h * s),
      );
  }, [layout, width, height, s, ox, oy]);
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      style={{ width, height }}
      aria-hidden
    />
  );
});
