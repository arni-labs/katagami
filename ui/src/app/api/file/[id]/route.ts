import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";
const ASSET_BROWSER_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";
const ASSET_CDN_CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

function decodeBase64ImageValue(
  bytes: ArrayBuffer,
  contentType: string,
): ArrayBuffer {
  const isImage = contentType.toLowerCase().startsWith("image/");
  if (!isImage || bytes.byteLength < 4) return bytes;

  const view = new Uint8Array(bytes);
  const looksBinaryImage =
    (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) ||
    (view[0] === 0x89 &&
      view[1] === 0x50 &&
      view[2] === 0x4e &&
      view[3] === 0x47) ||
    (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) ||
    (view[0] === 0x52 &&
      view[1] === 0x49 &&
      view[2] === 0x46 &&
      view[3] === 0x46);
  if (looksBinaryImage) return bytes;

  const text = new TextDecoder("ascii", { fatal: false }).decode(view).trim();
  const commaIndex = text.indexOf(",");
  const payload =
    text.startsWith("data:image/") && commaIndex >= 0
      ? text.slice(commaIndex + 1)
      : text;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) return bytes;

  try {
    const decoded = Buffer.from(payload, "base64");
    return decoded.buffer.slice(
      decoded.byteOffset,
      decoded.byteOffset + decoded.byteLength,
    );
  } catch {
    return bytes;
  }
}

// The stored mime_type is set by the contributor model, and some models set it
// wrong — never (→ "", or the POST's application/x-www-form-urlencoded), or to a
// download-forcing default (application/octet-stream). A browser served HTML or
// an image under such a type won't render it: the "Open" link downloads a file
// and the <img>/iframe breaks. So we DON'T trust an arbitrary stored mime.
//
// Instead of a blocklist of known-bad mimes (which can never be exhaustive — the
// next model invents a new wrong value and breaks again), we keep a SAFELIST of
// types that are genuinely renderable in a browser. A stored mime is honored only
// if it's on this list; anything else (missing, generic, or an unrecognized value
// like x-www-form-urlencoded) is resolved from the file's actual bytes. This way
// no contributor mime can ever force a download or break a preview — the class of
// bug is closed, and it retroactively fixes any file we'd otherwise miss.
const RENDERABLE_CONTENT_TYPES = new Set([
  // markup / text
  "text/html",
  "text/css",
  "text/plain",
  "text/markdown",
  "text/xml",
  "text/csv",
  "text/javascript",
  "application/xml",
  "application/json",
  "application/javascript",
  "application/ecmascript",
  "application/pdf",
  // images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "image/bmp",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  // fonts (the byte-sniffer can't identify these, so trust a correct mime)
  "font/woff",
  "font/woff2",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/x-font-woff",
  "application/vnd.ms-fontobject",
  // media
  "video/mp4",
  "video/webm",
  "video/ogg",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);

// Sniff a real content type from the bytes when the stored mime is generic.
// Magic numbers first (images/pdf), then a textual leading window (html/svg/
// css/json), defaulting to text/plain — anything but octet-stream so it renders.
function sniffContentType(bytes: ArrayBuffer): string {
  const v = new Uint8Array(bytes);
  if (v.length >= 4) {
    if (v[0] === 0x89 && v[1] === 0x50 && v[2] === 0x4e && v[3] === 0x47)
      return "image/png";
    if (v[0] === 0xff && v[1] === 0xd8 && v[2] === 0xff) return "image/jpeg";
    if (v[0] === 0x47 && v[1] === 0x49 && v[2] === 0x46) return "image/gif";
    if (v[0] === 0x52 && v[1] === 0x49 && v[2] === 0x46 && v[3] === 0x46)
      return "image/webp"; // RIFF (WebP)
    if (v[0] === 0x25 && v[1] === 0x50 && v[2] === 0x44 && v[3] === 0x46)
      return "application/pdf"; // %PDF
  }
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(v.subarray(0, 1024))
    .replace(/^﻿/, "")
    .trimStart();
  const lower = head.toLowerCase();
  // Some binaries are stored as base64 TEXT (or a data: URI) rather than raw
  // bytes — decodeBase64ImageValue decodes them later, but only if we resolve an
  // image/* type now. The leading base64 of each format's magic bytes is a
  // reliable tell, so a mis-mimed base64 image resolves correctly instead of
  // looking like plain text.
  const dataUri = head.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,/i);
  if (dataUri) return dataUri[1].toLowerCase();
  if (head.startsWith("/9j/")) return "image/jpeg"; // 0xFFD8FF
  if (head.startsWith("iVBORw0KGgo")) return "image/png"; // PNG signature
  if (head.startsWith("R0lGOD")) return "image/gif"; // "GIF8"
  if (head.startsWith("UklGR")) return "image/webp"; // "RIFF"
  if (head.startsWith("JVBER")) return "application/pdf"; // "%PDF"
  if (lower.startsWith("<?xml") && lower.includes("<svg"))
    return "image/svg+xml";
  if (lower.startsWith("<svg")) return "image/svg+xml";
  if (
    lower.startsWith("<!doctype html") ||
    lower.startsWith("<html") ||
    lower.includes("<html") ||
    lower.includes("<head") ||
    lower.includes("<body") ||
    lower.startsWith("<!--") ||
    head.startsWith("<")
  )
    return "text/html; charset=utf-8";
  if (lower.startsWith(":root") || /\{[^{}]*:[^{}]*(;|\})/.test(head))
    return "text/css; charset=utf-8";
  if (head.startsWith("{") || head.startsWith("["))
    return "application/json; charset=utf-8";
  return "text/plain; charset=utf-8";
}

// The type we should actually serve: honor the stored mime ONLY when it's a
// recognized renderable type; otherwise determine the real type from the bytes.
// So a correct mime is preserved, and any missing/generic/unrecognized one (the
// failure mode) is repaired from content — a mis-mimed HTML file opens, a
// mis-mimed image previews, and nothing is ever force-downloaded.
function resolveContentType(upstream: string, bytes: ArrayBuffer): string {
  const base = (upstream || "").split(";")[0].trim().toLowerCase();
  if (RENDERABLE_CONTENT_TYPES.has(base)) return upstream;
  return sniffContentType(bytes);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const fetchHeaders: Record<string, string> = { "X-Tenant-Id": TENANT };
  if (API_KEY) fetchHeaders["Authorization"] = `Bearer ${API_KEY}`;

  const res = await fetch(`${API_BASE}/tdata/Files('${id}')/$value`, {
    headers: fetchHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "File not found" },
      { status: res.status },
    );
  }

  const upstreamType = res.headers.get("content-type") || "";
  const upstreamBody = await res.arrayBuffer();
  // Repair a generic/missing upstream mime by sniffing the bytes, so a file
  // uploaded as application/octet-stream (the browser DOWNLOADS those) still
  // renders as the HTML/image/etc. it actually is.
  const contentType = resolveContentType(upstreamType, upstreamBody) || "text/html";
  const isImage = contentType.toLowerCase().startsWith("image/");
  const body = isImage
    ? decodeBase64ImageValue(upstreamBody, contentType)
    : upstreamBody;
  // Images are content-addressed and immutable, safe to cache for a day. HTML
  // compositions (landing/embodiment/dashboard) are MUTABLE — they're re-PUT in
  // place during curation — so a 24h CDN cache makes every fix invisible for a
  // day. Short-cache HTML so edits appear within ~30s; long-cache images.
  const browserCache = isImage
    ? ASSET_BROWSER_CACHE_CONTROL
    : "public, max-age=0, must-revalidate";
  const cdnCache = isImage
    ? ASSET_CDN_CACHE_CONTROL
    : "public, s-maxage=30, stale-while-revalidate=60";
  const responseHeaders = new Headers({
    "Content-Type": contentType,
    // These are design artifacts meant to render in-browser / inside iframes —
    // never force a download, regardless of the stored mime.
    "Content-Disposition": "inline",
    "Cache-Control": browserCache,
    "CDN-Cache-Control": cdnCache,
    "Vercel-CDN-Cache-Control": cdnCache,
  });
  responseHeaders.set("Content-Length", String(body.byteLength));

  return new NextResponse(body, {
    headers: responseHeaders,
  });
}
