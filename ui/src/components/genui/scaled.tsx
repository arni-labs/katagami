"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Lays a screen out at a fixed desktop width and scales it to the column it
// sits in, so four languages side by side each show desktop proportions.
export function Scaled({ width = 1024, children }: { width?: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(600);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const s = Math.min(1, o.clientWidth / width);
      setScale(s);
      setHeight(i.scrollHeight * s);
    };
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} style={{ width: "100%", height, overflow: "hidden", position: "relative" }}>
      <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        {children}
      </div>
    </div>
  );
}
