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

// Radically conservative tiers — crashes kept recurring with higher caps.
// Iframe browsing contexts are expensive even when just parked; keeping
// fewer alive is the only reliable safety net.
function computeMax(): number {
  if (typeof window === "undefined") return 3;
  const w = window.innerWidth;
  if (w < 640) return 2;
  if (w < 1024) return 3;
  if (w < 1536) return 4;
  return 6;
}

let MAX = computeMax();

// Only cards essentially ON-SCREEN (tight margin) are slot candidates.
// Cuts down the candidate pool so reshuffles are smaller.
const ROOT_MARGIN = "80px 0px 80px 0px";

// How long the user must be scroll-idle before slots can reshuffle.
const SCROLL_IDLE_MS = 250;

// Stagger between individual iframe mounts. 200ms gives the browser
// enough time between mounts to start cleaning up the previous mount's
// allocations before the next one begins.
const MOUNT_STAGGER_MS = 200;

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

// Staggered grant queue — deferred mounts.
const grantQueue: Entry[] = [];
let grantTimer: ReturnType<typeof setTimeout> | null = null;

function drainGrantQueue() {
  while (grantQueue.length > 0) {
    const entry = grantQueue.shift()!;
    // Entry may have been revoked / unregistered since enqueue — skip it.
    if (!entries.has(entry)) continue;
    if (entry.active) continue;
    if (!entry.intersecting) continue;
    entry.active = true;
    entry.grant();
    // Wait MOUNT_STAGGER_MS before mounting the next one.
    grantTimer = setTimeout(drainGrantQueue, MOUNT_STAGGER_MS);
    return;
  }
  grantTimer = null;
}

function tick() {
  if (typeof window === "undefined") return;

  const candidates = [...entries].filter((e) => e.intersecting);
  candidates.sort(
    (a, b) =>
      distanceToViewportCenter(a.el) - distanceToViewportCenter(b.el),
  );

  const winners = new Set(candidates.slice(0, MAX));

  // Revoke losers immediately — frees memory fast.
  for (const entry of entries) {
    if (entry.active && !winners.has(entry)) {
      entry.active = false;
      entry.revoke();
    }
  }

  // Clear any pending grants that no longer won.
  for (let i = grantQueue.length - 1; i >= 0; i--) {
    if (!winners.has(grantQueue[i])) grantQueue.splice(i, 1);
  }

  // Enqueue new winners (those not already active or pending).
  for (const entry of entries) {
    if (!entry.active && winners.has(entry) && !grantQueue.includes(entry)) {
      grantQueue.push(entry);
    }
  }

  // Kick off the staggered drain if it's not already running.
  if (!grantTimer && grantQueue.length > 0) drainGrantQueue();
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
    // Remove any pending grant for this entry.
    const qi = grantQueue.indexOf(entry);
    if (qi >= 0) grantQueue.splice(qi, 1);
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
