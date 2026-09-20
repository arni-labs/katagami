"use client";

import { useCallback, useRef, useState } from "react";
import { GalleryImage } from "@/components/gallery-image";

// Shapes already measured, so a tile that scrolls back into view opens at its own shape instead of flashing the default box.
const SHAPES = new Map<string, number>();

/** A picture at a fixed height in its own shape: the box follows the image, so nothing is stretched or cropped. */
export function FitPicture({ src, height, maxWidth, sizes = "160px" }: { src: string | null; height: number; maxWidth: number; sizes?: string }) {
  const box = useRef<HTMLSpanElement | null>(null);
  const [aspect, setAspect] = useState(() => (src && SHAPES.get(src)) || maxWidth / height);
  const measure = useCallback(() => {
    const img = box.current?.querySelector("img");
    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) { const shape = img.naturalWidth / img.naturalHeight; if (src) SHAPES.set(src, shape); setAspect(shape); }
  }, [src]);
  return (
    <span ref={box} className="relative mx-auto block shrink-0 overflow-hidden bg-muted [&_img]:object-contain" style={{ height, width: Math.min(maxWidth, Math.round(height * aspect)) }}>
      {src ? <GalleryImage src={src} alt="" sizes={sizes} className="object-contain" onLoad={measure} /> : null}
    </span>
  );
}
