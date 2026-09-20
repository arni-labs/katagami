"use client";

import { useEffect, useId, useState } from "react";

// The lens as glass, after Apple's Liquid Glass (HIG, Materials): a functional
// layer that floats over the content and lets it show through rather than
// hiding it. What that material does, and how each part is made here:
//  - it lenses: light bends at the rim, so what lies under the edge is pulled
//    and squeezed. An SVG displacement map, neutral in the middle and steep at
//    the rim, applied to the backdrop (Chromium only; elsewhere the rim is
//    merely brighter);
//  - the "regular" variant blurs and lifts the luminosity of what is beneath so
//    things set on it stay legible: a backdrop blur with extra saturation, so
//    the halftone under the lens turns to soft colour;
//  - it carries specular highlights that answer to movement: a bright arc on
//    the rim that swings to face the way the lens is travelling (--la);
//  - it adapts to light and dark, and drops its effects when the viewer asks
//    for less transparency.

/** A radial displacement map: flat in the middle, bending inward ever harder toward the rim. */
function rimMap(size: number): string {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  if (!g) return "";
  const img = g.createImageData(size, size), R = size / 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - R) / R, dy = (y - R) / R, d = Math.hypot(dx, dy), i = (y * size + x) * 4;
    const t = Math.min(1, Math.max(0, (d - 0.62) / 0.38)), bend = t * t * t; // the bevel: nothing, then a lot
    img.data[i] = 128 + (d ? (-dx / d) * bend * 127 : 0);
    img.data[i + 1] = 128 + (d ? (-dy / d) * bend * 127 : 0);
    img.data[i + 2] = 128; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function GlassLens({ radius, children }: { radius: number; children: React.ReactNode }) {
  const id = `lens${useId().replace(/[^a-zA-Z0-9]/g, "")}`, size = radius * 2; // plain letters and digits: the id goes into a CSS url()
  const [map, setMap] = useState("");
  useEffect(() => {
    // Backdrop filters that reference an SVG filter are a Chromium thing; elsewhere the declaration would be dropped whole.
    if (size < 40 || !("chrome" in window) || window.matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    const frame = requestAnimationFrame(() => setMap(rimMap(Math.min(512, size))));
    return () => cancelAnimationFrame(frame);
  }, [size]);
  return (
    <>
      {map ? (
        <svg aria-hidden width="0" height="0" className="absolute">
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feImage href={map} x="0" y="0" width={size} height={size} preserveAspectRatio="none" result="rim" />
            <feDisplacementMap in="SourceGraphic" in2="rim" scale={radius * 0.62} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      ) : null}
      <span aria-hidden className="glass-body" style={map ? { backdropFilter: `url(#${id}) blur(5px) saturate(1.9) brightness(1.05)` } : undefined} />
      <span aria-hidden className="glass-rim" />
      <span aria-hidden className="glass-spec" />
      {children}
    </>
  );
}
