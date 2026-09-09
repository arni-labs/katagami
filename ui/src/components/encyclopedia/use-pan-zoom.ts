"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

// A pannable, zoomable camera over a field of nodes. Pointer drag pans, wheel
// and pinch zoom about the cursor, buttons zoom about the viewport centre, and
// `fit` frames a set of world rectangles. Transitions animate with the house
// easing unless the user prefers reduced motion, in which case they jump.

export interface Camera {
  x: number;
  y: number;
  k: number;
}

export interface WorldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ZOOM_MIN = 0.18;
/** How far in the camera goes by default. A map with layers needs more than
 *  this: a cell on the deepest layer draws at a fraction of full size, so
 *  reading it means coming in by the reciprocal of that fraction. The
 *  encyclopedia passes its own ceiling for exactly that reason. */
export const ZOOM_MAX = 3.2;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

const noop = () => () => {};

/** The map owns every wheel and trackpad gesture over it. */
function swallowWheel(event: WheelEvent) {
  event.preventDefault();
}

/** False during server render and hydration, true once on the client — for
 *  portals to document.body. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function usePanZoom(initial: Camera = { x: 0, y: 0, k: 1 }, maxZoom: number = ZOOM_MAX, minZoom: number = ZOOM_MIN) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [camera, setCamera] = useState<Camera>(initial);
  const [animate, setAnimate] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; k: number; mid: { x: number; y: number }; cam: Camera } | null>(null);
  const [dragging, setDragging] = useState(false);
  // The same fact as `dragging`, readable without being a dependency. A card's
  // click handler has to know whether the pointer was dragged, and reading it
  // from state would make every handler change identity on every drag — which
  // is exactly the re-render the memoised cards exist to avoid.
  const draggingRef = useRef(false);
  const animateTimer = useRef<number | null>(null);
  // The camera readable from a handler without being its dependency, so the
  // handlers keep one identity across a pan and the memoised cards stay put.
  const cameraNow = useRef(camera);
  useEffect(() => { cameraNow.current = camera; }, [camera]);

  const glide = useCallback((next: Camera) => {
    setAnimate(true);
    setCamera(next);
    if (animateTimer.current) window.clearTimeout(animateTimer.current);
    animateTimer.current = window.setTimeout(() => setAnimate(false), 520);
  }, []);

  /** Clamp a zoom. Given the zoom the camera is at now, the floor is the
   *  lower of the floor and that zoom: the floor can rise above the camera
   *  when the paper shrinks under it, and no gesture that asks to zoom out
   *  may then zoom in. */
  const clampK = useCallback((k: number, current?: number) => Math.min(maxZoom, Math.max(current === undefined ? minZoom : Math.min(minZoom, current), k)), [maxZoom, minZoom]);

  const zoomAbout = useCallback((factor: number, sx: number, sy: number, smooth = false) => {
    setCamera((cam) => {
      const k = clampK(cam.k * factor, cam.k);
      const ratio = k / cam.k;
      const next = { k, x: sx - (sx - cam.x) * ratio, y: sy - (sy - cam.y) * ratio };
      return next;
    });
    if (smooth) {
      setAnimate(true);
      if (animateTimer.current) window.clearTimeout(animateTimer.current);
      animateTimer.current = window.setTimeout(() => setAnimate(false), 320);
    }
  }, [clampK]);

  const zoomStep = useCallback((direction: 1 | -1) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAbout(direction > 0 ? 1.45 : 1 / 1.45, rect.width / 2, rect.height / 2, true);
  }, [zoomAbout]);

  /** Frame the union of `rects` with `padding` screen pixels around it. */
  const fit = useCallback((rects: WorldRect[], padding = 64, maxK = 1.6) => {
    const el = viewportRef.current;
    if (!el || !rects.length) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.w));
    const maxY = Math.max(...rects.map((r) => r.y + r.h));
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const k = clampK(Math.min(maxK, (vw - padding * 2) / w, (vh - padding * 2) / h));
    glide({ k, x: (vw - w * k) / 2 - minX * k, y: (vh - h * k) / 2 - minY * k });
  }, [glide, clampK]);

  /** Put a world point at a screen point (defaults to the viewport centre). */
  const centerOn = useCallback((wx: number, wy: number, k?: number, screen?: { x: number; y: number }) => {
    const el = viewportRef.current;
    if (!el) return;
    const sx = screen?.x ?? el.clientWidth / 2;
    const sy = screen?.y ?? el.clientHeight / 2;
    setCamera((cam) => {
      const kk = clampK(k ?? cam.k);
      return { k: kk, x: sx - wx * kk, y: sy - wy * kk };
    });
    setAnimate(true);
    if (animateTimer.current) window.clearTimeout(animateTimer.current);
    animateTimer.current = window.setTimeout(() => setAnimate(false), 520);
  }, [clampK]);

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const sx = event.clientX - rect.left;
    const sy = event.clientY - rect.top;
    // Trackpad pinch arrives as a ctrlKey wheel; a plain wheel zooms too —
    // this is a field, not a page. Zoom about the cursor either way.
    const scale = event.deltaMode === 1 ? 0.05 : event.deltaMode === 2 ? 0.5 : 0.0022;
    const factor = Math.min(1.4, Math.max(0.7, Math.exp(-event.deltaY * scale)));
    zoomAbout(factor, sx, sy);
  }, [zoomAbout]);

  /** A node has taken this pointer for its own drag. The camera does not pan
   *  with it, but the pointer still counts toward a pinch: a second finger
   *  landing anywhere then zooms, as it would if the first had landed on
   *  bare paper. Returns true when that pinch has begun, so the node drag
   *  can stand down. */
  const claimPointer = useCallback((event: React.PointerEvent): boolean => {
    const el = viewportRef.current;
    if (!el) return false;
    pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current.size !== 2) return false;
    for (const id of pinch.current.keys()) { try { el.setPointerCapture(id); } catch { /* pointer already gone */ } }
    const [a, b] = [...pinch.current.values()];
    const rect = el.getBoundingClientRect();
    const cam = cameraNow.current;
    pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: cam.k, mid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top }, cam };
    drag.current = null;
    return true;
  }, []);
  const pinching = useCallback(() => pinchStart.current !== null, []);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Capture only once a drag or pinch is real: capturing on pointerdown
    // would redirect the pointerup, and the click a node needs would land on
    // the viewport instead of the node.
    pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current.size === 2) {
      for (const id of pinch.current.keys()) { try { el.setPointerCapture(id); } catch { /* pointer already gone */ } }
      const [a, b] = [...pinch.current.values()];
      const rect = el.getBoundingClientRect();
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        k: camera.k,
        mid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
        cam: camera,
      };
      drag.current = null;
      return;
    }
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: camera.x, cy: camera.y, moved: false };
  }, [camera]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (pinch.current.has(event.pointerId)) pinch.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinch.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pinch.current.values()];
      const start = pinchStart.current;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const k = clampK(start.k * (dist / Math.max(1, start.dist)), start.k);
      const el = viewportRef.current!;
      const rect = el.getBoundingClientRect();
      const mid = { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top };
      const ratio = k / start.cam.k;
      setCamera({ k, x: mid.x - (start.mid.x - start.cam.x) * ratio, y: mid.y - (start.mid.y - start.cam.y) * ratio });
      return;
    }
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dy = event.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true;
      draggingRef.current = true;
      setDragging(true);
      try { viewportRef.current?.setPointerCapture(event.pointerId); } catch { /* pointer already gone */ }
    }
    if (d.moved) setCamera((cam) => ({ ...cam, x: d.cx + dx, y: d.cy + dy }));
  }, [clampK]);

  const endPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pinch.current.delete(event.pointerId);
    if (pinch.current.size < 2) pinchStart.current = null;
    if (drag.current?.id === event.pointerId) {
      drag.current = null;
      // Let the click that follows a real drag be ignored by nodes.
      window.setTimeout(() => { draggingRef.current = false; setDragging(false); }, 0);
    }
  }, []);

  // Wheel must be non-passive to preventDefault; React attaches passive wheel
  // listeners, so register directly — and register on whatever element the
  // viewport is right now. An effect run once at mount found nothing on a
  // phone, where the map is mounted later on request, and the page scrolled
  // under every wheel and trackpad gesture over the map.
  const wheelTarget = useRef<HTMLDivElement | null>(null);
  const guardWheel = useCallback((el: HTMLDivElement | null) => {
    if (wheelTarget.current) wheelTarget.current.removeEventListener("wheel", swallowWheel);
    wheelTarget.current = el;
    el?.addEventListener("wheel", swallowWheel, { passive: false });
  }, []);
  useEffect(() => () => guardWheel(null), [guardWheel]);

  const toWorld = useCallback((sx: number, sy: number) => ({ x: (sx - camera.x) / camera.k, y: (sy - camera.y) / camera.k }), [camera]);

  const handlers = useMemo(() => ({
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp: endPointer,
    onPointerCancel: endPointer,
    onPointerLeave: endPointer,
  }), [onWheel, onPointerDown, onPointerMove, endPointer]);

  return { viewportRef, camera, setCamera, animate, dragging, draggingRef, handlers, zoomStep, zoomAbout, fit, centerOn, glide, toWorld, guardWheel, claimPointer, pinching };
}
