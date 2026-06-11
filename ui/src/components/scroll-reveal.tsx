"use client";

import { useEffect } from "react";

/**
 * ScrollReveal — reveals every element marked `data-reveal` or
 * `data-reveal-children` as it enters the viewport (adds `.reveal-in`,
 * one-shot).
 *
 * It uses an IntersectionObserver on purpose: the callback fires
 * ASYNCHRONOUSLY, always after React has finished hydrating, so adding
 * `.reveal-in` can never diverge the DOM mid-hydration (which would throw
 * a hydration-mismatch error). A large top rootMargin keeps the
 * jump-past guarantee a bare observer lacks: any element at or above the
 * trigger line — including ones skipped by an anchor jump or fast scroll
 * — counts as intersecting and reveals, so nothing is ever stranded
 * hidden.
 *
 * The hidden state lives in CSS behind `html.reveal-ready`, set by an
 * inline pre-paint script only when motion is allowed — so JS-off and
 * reduced-motion users see everything immediately, with no flash.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (!document.documentElement.classList.contains("reveal-ready")) return;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("reveal-in");
          obs.unobserve(entry.target);
        }
      },
      // Root reaches far above the viewport (catch anything scrolled past)
      // and stops ~10% from the bottom (the reveal trigger line).
      { rootMargin: "9999px 0px -10% 0px", threshold: 0 },
    );

    const observed = new WeakSet<Element>();
    const SELECTOR = "[data-reveal],[data-reveal-children]";
    const watch = (el: Element) => {
      if (observed.has(el) || el.classList.contains("reveal-in")) return;
      observed.add(el);
      io.observe(el);
    };
    const observe = (root: ParentNode) => {
      if (root instanceof Element && root.matches(SELECTOR)) watch(root);
      root.querySelectorAll?.(SELECTOR).forEach(watch);
    };

    observe(document);

    // Catch content mounted after first paint (client islands, route
    // transitions).
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) observe(node as Element);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}

/** Inline, pre-paint: arm the reveal system only when motion is allowed.
 *  Injected in <head> so the hidden state applies before first paint. */
export const REVEAL_INIT_SCRIPT = `
(function(){
  try{
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reveal-ready');
    }
  }catch(e){}
})();
`;
