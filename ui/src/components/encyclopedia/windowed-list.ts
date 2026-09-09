"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// A list that mounts only the rows the reader can see.
//
// The encyclopedia's lists are as long as the library: the index sheet already
// draws a row, and a thumbnail, for every cell there is. At seven hundred that
// is slow on a phone; at five thousand it is a page that never finishes. Rows
// here are one height, so the window is arithmetic rather than measurement,
// and what is mounted is a constant however long the list gets.

export interface Window {
  /** First row to mount. */
  from: number;
  /** One past the last row to mount. */
  to: number;
  /** The full height the list would have, so the scrollbar tells the truth. */
  totalHeight: number;
  /** How far down to offset the mounted rows. */
  offsetTop: number;
}

/** How many rows beyond the viewport stay mounted at each end, so a flick
 *  does not scroll past the end of what has been drawn. */
const OVERSCAN = 6;

/**
 *  @param count  how many rows the list has
 *  @param rowHeight  the height of one row, in CSS pixels
 *  @param scrollRef  the element that scrolls — the list's own scroll parent
 */
export function useWindowedList(
  count: number,
  rowHeight: number,
  scrollRef: React.RefObject<HTMLElement | null>,
): { window: Window } {
  const [range, setRange] = useState({ from: 0, to: Math.min(count, 24) });
  // The measured geometry is read in a rAF so a burst of scroll events costs
  // one measurement per frame rather than one per event.
  const frame = useRef<number | null>(null);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = Math.max(0, el.scrollTop);
    const height = el.clientHeight || 600;
    const first = Math.max(0, Math.floor(top / rowHeight) - OVERSCAN);
    const last = Math.min(count, Math.ceil((top + height) / rowHeight) + OVERSCAN);
    setRange((at) => (at.from === first && at.to === last ? at : { from: first, to: last }));
  }, [scrollRef, rowHeight, count]);

  // The listener lives here rather than on a prop the caller has to remember
  // to wire up: the window and the element it is a window onto belong
  // together. It re-attaches when the list changes under the reader — a new
  // search, a different level — which is also when the window must be redrawn.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        measure();
      });
    };
    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [measure, scrollRef]);

  const from = Math.min(range.from, Math.max(0, count - 1));
  const to = Math.min(range.to, count);
  return { window: { from, to, totalHeight: count * rowHeight, offsetTop: from * rowHeight } };
}
