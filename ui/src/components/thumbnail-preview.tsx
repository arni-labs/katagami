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
const preloadSubscribers = new WeakMap<Element, Callback>();
let sharedObserver: IntersectionObserver | null = null;
let sharedPreloadObserver: IntersectionObserver | null = null;
const loadQueue: QueueItem[] = [];
const preloadQueue: string[] = [];
const preloadingUrls = new Set<string>();
const preloadedUrls = new Set<string>();
let activeLoads = 0;
let activePreloads = 0;
const MAX_CONCURRENT_THUMBNAILS = 6;
const MAX_CONCURRENT_PRELOADS = 4;
const THUMBNAIL_LOAD_TIMEOUT_MS = 30000;
// Load ~one viewport ahead, prefetch ~two. The previous 3200px/12000px margins
// eagerly decoded/fetched dozens of off-screen thumbnails during a scroll,
// churning memory for images the user might never reach.
const LOAD_ROOT_MARGIN = "900px 0px 900px 0px";
const PRELOAD_ROOT_MARGIN = "1800px 0px 1800px 0px";

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

function drainPreloadQueue() {
  while (
    activePreloads < MAX_CONCURRENT_PRELOADS &&
    preloadQueue.length > 0
  ) {
    const url = preloadQueue.shift();
    if (!url || preloadedUrls.has(url)) continue;
    activePreloads += 1;
    fetch(url, { cache: "force-cache" })
      .then(async (res) => {
        if (res.ok) {
          await res.arrayBuffer();
          preloadedUrls.add(url);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        preloadingUrls.delete(url);
        activePreloads = Math.max(0, activePreloads - 1);
        drainPreloadQueue();
      });
  }
}

function enqueueThumbnailPreload(url: string) {
  if (preloadedUrls.has(url) || preloadingUrls.has(url)) return;
  preloadingUrls.add(url);
  preloadQueue.push(url);
  drainPreloadQueue();
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
      rootMargin: LOAD_ROOT_MARGIN,
      threshold: 0,
    },
  );

  return sharedObserver;
}

function getThumbnailPreloadObserver(): IntersectionObserver | null {
  if (typeof window === "undefined") return null;
  if (sharedPreloadObserver) return sharedPreloadObserver;

  sharedPreloadObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cb = preloadSubscribers.get(entry.target);
        if (cb) cb();
      }
    },
    {
      rootMargin: PRELOAD_ROOT_MARGIN,
      threshold: 0,
    },
  );

  return sharedPreloadObserver;
}

export function ThumbnailPreview({
  fileId,
  src: assetSrc,
  alt,
  placeholderTint,
  paletteColors = [],
  eager = false,
}: {
  fileId?: string;
  src?: string;
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
  const src = assetSrc ?? (fileId ? getFileUrl(fileId) : "");

  useEffect(() => {
    if (!src) return;
    if (eager) return;
    const el = rootRef.current;
    const observer = getThumbnailPreloadObserver();
    if (!el || !observer) {
      enqueueThumbnailPreload(src);
      return;
    }

    const preload = () => {
      preloadSubscribers.delete(el);
      observer.unobserve(el);
      enqueueThumbnailPreload(src);
    };

    preloadSubscribers.set(el, preload);
    observer.observe(el);
    return () => {
      preloadSubscribers.delete(el);
      observer.unobserve(el);
    };
  }, [eager, src]);

  useEffect(() => {
    if (!src) return;
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
  }, [eager, src]);

  const finishThumbnailLoad = () => {
    loadTicketRef.current?.finish();
    loadTicketRef.current = null;
  };

  return (
    <div ref={rootRef} className="absolute inset-0">
      {failed || !shouldLoad || !src ? (
        <ThumbnailPlaceholder
          paletteColors={paletteColors}
          placeholderTint={placeholderTint}
        />
      ) : (
        // Published cards pass immutable asset URLs; file ids are reserved for
        // draft/admin previews where governed file access is still expected.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={600}
          height={400}
          loading="eager"
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
          className="absolute inset-0 h-full w-full object-cover"
          data-katagami-thumbnail="true"
          data-file-id={fileId ?? undefined}
          onLoad={() => {
            preloadedUrls.add(src);
            finishThumbnailLoad();
          }}
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
