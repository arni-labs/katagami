"use client";

import { useEffect, useRef, useState } from "react";

// A single IntersectionObserver shared across every card that uses this hook.
// Per-card observers would create 30+ browser observer instances on the
// gallery; a shared one is functionally identical but cheaper.

type Callback = (inView: boolean) => void;

let sharedObserver: IntersectionObserver | null = null;
const subscribers = new WeakMap<Element, Callback>();

function getSharedObserver(): IntersectionObserver | null {
  if (typeof window === "undefined") return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cb = subscribers.get(entry.target);
          if (cb) cb(entry.isIntersecting);
        }
      },
      // Larger margin = iframe starts fetching before the card is visible,
      // so by the time the user scrolls to it the content is already painted.
      { rootMargin: "600px 0px 600px 0px", threshold: 0 },
    );
  }
  return sharedObserver;
}

export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = getSharedObserver();
    if (!io) return;
    subscribers.set(el, setInView);
    io.observe(el);
    return () => {
      subscribers.delete(el);
      io.unobserve(el);
    };
  }, []);

  return { ref, inView };
}
