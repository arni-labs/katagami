"use client";

import { useEffect } from "react";

/**
 * ScrollReveal — reveals every element marked `data-reveal` or
 * `data-reveal-children` once its top crosses a trigger line near the
 * bottom of the viewport (adds `.reveal-in`, one-shot). A scroll-line
 * check (rather than a bare IntersectionObserver) is deliberate: it also
 * reveals anything ABOVE the line, so anchor jumps / fast scrolls can
 * never strand a block hidden.
 *
 * The hidden state lives in CSS behind `html.reveal-ready`, set by an
 * inline pre-paint script only when motion is allowed — so JS-off and
 * reduced-motion users see everything immediately, with no flash.
 */
export function ScrollReveal() {
  useEffect(() => {
    if (!document.documentElement.classList.contains("reveal-ready")) return;

    const armed = new Set<Element>();
    const collect = () => {
      document
        .querySelectorAll("[data-reveal],[data-reveal-children]")
        .forEach((el) => {
          if (!el.classList.contains("reveal-in")) armed.add(el);
        });
    };

    let ticking = false;
    const check = () => {
      ticking = false;
      const line = window.innerHeight * 0.9;
      for (const el of [...armed]) {
        if (el.getBoundingClientRect().top < line) {
          el.classList.add("reveal-in");
          armed.delete(el);
        }
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };

    collect();
    requestAnimationFrame(check);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Catch content mounted after first paint (client islands, route
    // transitions): register new armed nodes and re-check.
    const mo = new MutationObserver(() => {
      collect();
      onScroll();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
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
