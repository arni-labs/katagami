"use client";

import { useEffect, useRef, useState } from "react";
import { getFileUrl } from "@/lib/odata";

type Callback = () => void;
type LoadTicket = {
  cancel: () => void;
  finish: () => void;
};
type QueueItem = {
  start: Callback;
  cancelled: boolean;
  started: boolean;
  finished: boolean;
  timeout: number | null;
};

const subscribers = new WeakMap<Element, Callback>();
let sharedObserver: IntersectionObserver | null = null;
const loadQueue: QueueItem[] = [];
let activeLoads = 0;
const MAX_CONCURRENT_THUMBNAILS = 3;
const THUMBNAIL_LOAD_TIMEOUT_MS = 30000;

function finishQueueItem(item: QueueItem) {
  if (!item.started || item.finished) return;
  item.finished = true;
  if (item.timeout) window.clearTimeout(item.timeout);
  activeLoads = Math.max(0, activeLoads - 1);
  drainLoadQueue();
}

function drainLoadQueue() {
  while (
    activeLoads < MAX_CONCURRENT_THUMBNAILS &&
    loadQueue.length > 0
  ) {
    const item = loadQueue.shift();
    if (!item || item.cancelled || item.finished) continue;
    activeLoads += 1;
    item.started = true;
    item.timeout = window.setTimeout(
      () => finishQueueItem(item),
      THUMBNAIL_LOAD_TIMEOUT_MS,
    );
    item.start();
  }
}

function enqueueThumbnailLoad(start: Callback): LoadTicket {
  const item: QueueItem = {
    start,
    cancelled: false,
    started: false,
    finished: false,
    timeout: null,
  };
  loadQueue.push(item);
  drainLoadQueue();
  return {
    cancel: () => {
      item.cancelled = true;
      finishQueueItem(item);
    },
    finish: () => finishQueueItem(item),
  };
}

function getThumbnailObserver(): IntersectionObserver | null {
  if (typeof window === "undefined") return null;
  if (sharedObserver) return sharedObserver;

  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cb = subscribers.get(entry.target);
        if (cb) cb();
      }
    },
    {
      rootMargin: "1200px 0px 1200px 0px",
      threshold: 0,
    },
  );

  return sharedObserver;
}

export function ThumbnailPreview({
  fileId,
  alt,
  placeholderTint,
  paletteColors = [],
  eager = false,
}: {
  fileId: string;
  alt: string;
  placeholderTint: string;
  paletteColors?: string[];
  eager?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const loadTicketRef = useRef<LoadTicket | null>(null);
  const queuedRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (eager) return;
    const el = rootRef.current;
    const observer = getThumbnailObserver();
    if (!el || !observer) {
      const timer = window.setTimeout(() => setShouldLoad(true), 0);
      return () => window.clearTimeout(timer);
    }

    const load = () => {
      subscribers.delete(el);
      observer.unobserve(el);
      if (queuedRef.current) return;
      queuedRef.current = true;
      loadTicketRef.current = enqueueThumbnailLoad(() => setShouldLoad(true));
    };

    subscribers.set(el, load);
    observer.observe(el);
    return () => {
      subscribers.delete(el);
      observer.unobserve(el);
      loadTicketRef.current?.cancel();
      loadTicketRef.current = null;
    };
  }, [eager]);

  const finishThumbnailLoad = () => {
    loadTicketRef.current?.finish();
    loadTicketRef.current = null;
  };

  return (
    <div ref={rootRef} className="absolute inset-0">
      {failed || !shouldLoad ? (
        <ThumbnailPlaceholder
          paletteColors={paletteColors}
          placeholderTint={placeholderTint}
        />
      ) : (
        // Direct file-proxy delivery is intentional: thumbnail_file_id already
        // points at a generated, card-sized PawFS image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getFileUrl(fileId)}
          alt={alt}
          width={600}
          height={400}
          loading="eager"
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          className="absolute inset-0 h-full w-full object-cover"
          data-katagami-thumbnail="true"
          data-file-id={fileId}
          onLoad={() => finishThumbnailLoad()}
          onError={() => {
            finishThumbnailLoad();
            setFailed(true);
          }}
        />
      )}
    </div>
  );
}

function ThumbnailPlaceholder({
  paletteColors,
  placeholderTint,
}: {
  paletteColors: string[];
  placeholderTint: string;
}) {
  const dots = paletteColors.length > 0 ? paletteColors : [placeholderTint];

  return (
    <div
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `color-mix(in srgb, ${placeholderTint} 6%, var(--paper-tape-mix))`,
      }}
    >
      <div className="flex gap-1.5">
        {dots.slice(0, 4).map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
}
