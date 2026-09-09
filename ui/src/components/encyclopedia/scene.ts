export interface Camera {
  x: number;
  y: number;
  k: number;
}

export function zoomAt(
  c: Camera,
  factor: number,
  x: number,
  y: number,
): Camera {
  const k = Math.max(0.000001, Math.min(65536, c.k * factor));
  const ratio = k / c.k;
  return { k, x: x - (x - c.x) * ratio, y: y - (y - c.y) * ratio };
}
