"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Global concurrent-iframe cap for the gallery.
 *
 * No matter how many cards are rendered in the DOM, at most MAX iframes
 * are mounted at any given moment. The MAX iframes are the ones whose
 * elements are closest to the viewport center — so as the user scrolls,
 * slots hand off from cards scrolling away to cards scrolling in.
 *
 * Cards that don't currently hold a slot render a placeholder in place
 * of the iframe — visually identical chrome, zero iframe cost.
 *
 * This is the definitive memory bound: total iframe memory ≤ MAX × one.
 */

// Shadow-DOM previews are ~100× cheaper than iframes, so we can comfortably
// fill the visible grid (and buffer) on every device class.
//   mobile  (<640px)  → 6
//   tablet  (<1024px) → 14
//   desktop (<1536px) → 24
//   wide    (≥1536px) → 32
function computeMax(): number {
  if (typeof window === "undefined") return 12;
  const w = window.innerWidth;
  if (w < 640) return 6;
  if (w < 1024) return 14;
  if (w < 1536) return 24;
  return 32;
}

let MAX = computeMax();

// Observation buffer — cards further than this from the viewport are
// never candidates for a slot. Keeps the "candidate pool" small.
const ROOT_MARGIN = "400px 0px 400px 0px";

type Entry = {
  el: HTMLElement;
  intersecting: boolean;
  active: boolean;
  grant: () => void;
  revoke: () => void;
};

const entries = new Set<Entry>();
let sharedIO: IntersectionObserver | null = null;

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
      scheduleTick();
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

let scheduled = false;
function scheduleTick() {
  if (scheduled || typeof window === "undefined") return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    tick();
  });
}

let scrollListenerAttached = false;
function attachScrollListener() {
  if (scrollListenerAttached || typeof window === "undefined") return;
  scrollListenerAttached = true;
  window.addEventListener("scroll", scheduleTick, { passive: true });
  window.addEventListener("resize", () => {
    MAX = computeMax();
    scheduleTick();
  });
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
  attachScrollListener();
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
 * Hook: attach `ref` to an element, returns whether this element currently
 * holds an iframe slot. At most MAX elements across the whole page hold
 * a slot at once — the ones closest to the viewport center win.
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
