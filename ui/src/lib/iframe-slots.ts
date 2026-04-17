"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global concurrent-iframe manager for the gallery.
 *
 * Two constraints together stop crashes:
 *
 * 1. HARD CAP — at most MAX iframes exist in the DOM at any moment, no
 *    matter how many cards are rendered. The winners are the MAX cards
 *    whose element centers are closest to the viewport center.
 *
 * 2. CHURN CONTROL — slots are NOT reshuffled during scroll. A fast
 *    scroll used to trigger ~15–20 iframe mount/unmount events per second
 *    (via a per-frame rAF tick), which piled up iframe browsing contexts
 *    faster than the browser could GC them — the real source of the
 *    scroll crash. Slot reshuffles now only run when the scroll is idle
 *    (or on non-scroll events like resize / initial load).
 *
 *    During scroll the current winners keep their iframes. When the user
 *    pauses for ~200ms, one bulk update runs.
 */

function computeMax(): number {
  if (typeof window === "undefined") return 6;
  const w = window.innerWidth;
  if (w < 640) return 3;
  if (w < 1024) return 6;
  if (w < 1536) return 9;
  return 12;
}

let MAX = computeMax();

// Observation buffer — cards further than this from the viewport are never
// candidates for a slot. Keeps the candidate pool small.
const ROOT_MARGIN = "400px 0px 400px 0px";

// How long the user must be scroll-idle before slots can reshuffle.
const SCROLL_IDLE_MS = 200;

type Entry = {
  el: HTMLElement;
  intersecting: boolean;
  active: boolean;
  grant: () => void;
  revoke: () => void;
};

const entries = new Set<Entry>();
let sharedIO: IntersectionObserver | null = null;
let isScrolling = false;
let scrollIdleTimer: ReturnType<typeof setTimeout> | null = null;

function getIO(): IntersectionObserver | null {
  if (typeof window === "undefined") return null;
  if (sharedIO) return sharedIO;
  sharedIO = new IntersectionObserver(
    (ioEntries) => {
      for (const ioEntry of ioEntries) {
        for (const entry of entries) {
          if (entry.el === ioEntry.target) {
            entry.intersecting = ioEntry.isIntersecting;
            break;
          }
        }
      }
      // While the user is actively scrolling, skip the tick — it will run
      // when the scroll settles. This is what stops the mount/unmount churn
      // that was crashing tabs.
      if (!isScrolling) scheduleTick();
    },
    { rootMargin: ROOT_MARGIN, threshold: 0 },
  );
  return sharedIO;
}

function distanceToViewportCenter(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const vpCenter = window.innerHeight / 2;
  const elCenter = rect.top + rect.height / 2;
  return Math.abs(elCenter - vpCenter);
}

function tick() {
  if (typeof window === "undefined") return;

  const candidates = [...entries].filter((e) => e.intersecting);
  candidates.sort(
    (a, b) =>
      distanceToViewportCenter(a.el) - distanceToViewportCenter(b.el),
  );

  const winners = new Set(candidates.slice(0, MAX));

  for (const entry of entries) {
    const shouldBeActive = winners.has(entry);
    if (entry.active && !shouldBeActive) {
      entry.active = false;
      entry.revoke();
    } else if (!entry.active && shouldBeActive) {
      entry.active = true;
      entry.grant();
    }
  }
}

let tickScheduled = false;
function scheduleTick() {
  if (tickScheduled || typeof window === "undefined") return;
  tickScheduled = true;
  requestAnimationFrame(() => {
    tickScheduled = false;
    tick();
  });
}

function onScroll() {
  isScrolling = true;
  if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
  scrollIdleTimer = setTimeout(() => {
    isScrolling = false;
    scrollIdleTimer = null;
    // Fire one bulk reshuffle based on the final scroll position.
    scheduleTick();
  }, SCROLL_IDLE_MS);
}

function onResize() {
  MAX = computeMax();
  scheduleTick();
}

let listenersAttached = false;
function attachListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
}

function register(
  el: HTMLElement,
  grant: () => void,
  revoke: () => void,
): () => void {
  const entry: Entry = {
    el,
    intersecting: false,
    active: false,
    grant,
    revoke,
  };
  entries.add(entry);
  attachListeners();
  const io = getIO();
  io?.observe(el);
  return () => {
    if (entry.active) {
      entry.active = false;
      revoke();
    }
    entries.delete(entry);
    io?.unobserve(el);
  };
}

/**
 * Hook: attach `ref` to an element; returns whether this element currently
 * holds an iframe slot.
 */
export function useIframeSlot<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [hasSlot, setHasSlot] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return register(
      el,
      () => setHasSlot(true),
      () => setHasSlot(false),
    );
  }, []);

  return { ref, hasSlot };
}
