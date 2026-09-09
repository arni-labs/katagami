"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { zoomAt, type Camera } from "./scene";

export function useMapCamera() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const current = useRef<Camera>({ x: 24, y: 24, k: 0.7 });
  const [camera, publish] = useState<Camera>({ x: 24, y: 24, k: 0.7 });
  const frame = useRef<number | null>(null);
  const animation = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    camera: Camera;
    x: number;
    y: number;
    distance: number;
  } | null>(null);
  const suppressed = useRef(false);
  const [dragging, setDragging] = useState(false);
  const setCamera = useCallback((next: Camera) => {
    current.current = next;
    if (frame.current === null)
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        publish(current.current);
      });
  }, []);
  const stop = useCallback(() => {
    if (animation.current !== null) cancelAnimationFrame(animation.current);
    animation.current = null;
  }, []);
  const move = useCallback(
    (next: Camera, smooth = true) => {
      stop();
      if (
        !smooth ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setCamera(next);
        return;
      }
      const start = current.current,
        began = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - began) / 280),
          eased = 1 - (1 - t) ** 3;
        setCamera({
          x: start.x + (next.x - start.x) * eased,
          y: start.y + (next.y - start.y) * eased,
          k: start.k + (next.k - start.k) * eased,
        });
        if (t < 1) animation.current = requestAnimationFrame(tick);
        else animation.current = null;
      };
      animation.current = requestAnimationFrame(tick);
    },
    [setCamera, stop],
  );
  const readCamera = useCallback(() => current.current, []);
  const zoom = useCallback(
    (factor: number) => {
      const el = viewportRef.current;
      if (!el) return;
      move(
        zoomAt(
          current.current,
          factor,
          el.clientWidth / 2,
          el.clientHeight / 2,
        ),
      );
    },
    [move],
  );
  const rebase = useCallback(() => {
    const points = [...pointers.current.values()];
    const a = points[0],
      b = points[1];
    if (!a) {
      gesture.current = null;
      return;
    }
    gesture.current = {
      camera: current.current,
      x: b ? (a.x + b.x) / 2 : a.x,
      y: b ? (a.y + b.y) / 2 : a.y,
      distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0,
    };
  }, []);
  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest("[data-map-control]"))
        return;
      stop();
      if (pointers.current.size === 0) suppressed.current = false;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      rebase();
    },
    [rebase, stop],
  );
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gesture.current,
        el = viewportRef.current;
      if (!g || !el) return;
      const points = [...pointers.current.values()],
        a = points[0],
        b = points[1];
      const x = b ? (a.x + b.x) / 2 : a.x,
        y = b ? (a.y + b.y) / 2 : a.y;
      if (!suppressed.current && !b && Math.hypot(x - g.x, y - g.y) < 5) return;
      suppressed.current = true;
      setDragging(true);
      if (!el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
      const rect = el.getBoundingClientRect();
      const scaled =
        b && g.distance > 0
          ? zoomAt(
              g.camera,
              Math.hypot(a.x - b.x, a.y - b.y) / g.distance,
              g.x - rect.left,
              g.y - rect.top,
            )
          : g.camera;
      setCamera({ ...scaled, x: scaled.x + x - g.x, y: scaled.y + y - g.y });
    },
    [setCamera],
  );
  const onPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(e.pointerId);
      const el = viewportRef.current;
      if (el?.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
      rebase();
      if (!pointers.current.size) setDragging(false);
    },
    [rebase],
  );
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (e.target instanceof Element && e.target.closest("[data-map-control]"))
        return;
      e.preventDefault();
      stop();
      const rect = el.getBoundingClientRect();
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1);
      setCamera(
        zoomAt(
          current.current,
          Math.exp(
            -Math.max(-150, Math.min(150, delta)) * (e.ctrlKey ? 0.008 : 0.003),
          ),
          e.clientX - rect.left,
          e.clientY - rect.top,
        ),
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", wheel);
      stop();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [setCamera, stop]);
  return {
    viewportRef,
    camera,
    current,
    readCamera,
    move,
    zoom,
    setCamera,
    dragging,
    suppressed,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture: onPointerUp,
    },
  };
}
