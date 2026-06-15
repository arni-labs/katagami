"use client";

import { useEffect } from "react";

/**
 * ScrollReveal — reveals every element marked `data-reveal` (and the direct
 * children of `data-reveal-children`, staggered) as it enters the viewport.
 *
 * Why it is hydration-safe: the reveal is played with the Web Animations API
 * (`element.animate`), NOT by toggling a class or inline style. WAAPI applies
 * its values through the animation cascade origin, so it never touches the
 * element's `class`/`style` ATTRIBUTE — the thing React reconciles during
 * hydration. That means it cannot diverge the server and client DOM even if it
 * fires before a Suspense boundary has finished hydrating (the cause of the
 * earlier class-toggle hydration mismatch).
 *
 * Why it is robust: the observer's root is the viewport, so unlike CSS
 * view-timelines it does not depend on the overflow/scroll-container topology
 * of ancestors (several wrappers here use `overflow-x: hidden`, which would
 * silently hijack a `view()` timeline's scroll root).
 *
 * The hidden START state lives in CSS behind `html.reveal-ready`, set by an
 * inline pre-paint script only when motion is allowed — so JS-off and
 * reduced-motion users see everything immediately, with no flash.
 */
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function play(el: HTMLElement) {
  el.animate(
    [
      { opacity: 0, transform: "translateY(18px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 620, easing: EASE, fill: "forwards" },
  );
}

function playChildren(container: Element) {
  const kids = Array.from(container.children) as HTMLElement[];
  kids.forEach((kid, i) => {
    kid.animate(
      [
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      {
        duration: 560,
        delay: Math.min(i, 6) * 55,
        easing: EASE,
        fill: "both",
      },
    );
  });
}

export function ScrollReveal() {
  useEffect(() => {
    if (!document.documentElement.classList.contains("reveal-ready")) return;

    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          if (el.hasAttribute("data-reveal-children")) playChildren(el);
          else play(el);
          obs.unobserve(el);
        }
      },
      // Root reaches far above the viewport (catch anything scrolled past)
      // and stops ~10% from the bottom (the reveal trigger line).
      { rootMargin: "9999px 0px -10% 0px", threshold: 0 },
    );

    const observed = new WeakSet<Element>();
    const SELECTOR = "[data-reveal],[data-reveal-children]";
    const watch = (el: Element) => {
      if (observed.has(el)) return;
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
