import { NextRequest, NextResponse } from "next/server";
import {
  fetchServableFileBytes,
  fileResponseHeaders,
  REFUSAL_STATUS,
} from "@/lib/file-visibility";
import { isOwner } from "@/lib/owner";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

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

  // This proxy holds the app's credential, so whatever it agrees to fetch is
  // public. `fetchServableFileBytes` resolves the file's projection and judges
  // it before requesting a single byte — see `isPubliclyServableFile`. State
  // alone is not a permission: PawFS retains archived bytes for governed
  // recovery, and `Ready` is equally true of every agent skill in the tenant.
  //
  // Every refusal — missing, off-surface, malformed, or upstream 401/403 —
  // comes back as `null` and leaves here as a 404. Never a 403: a
  // distinguishable "exists but forbidden" would let anyone enumerate real ids,
  // and ids here are deterministic enough to guess.
  // `isOwner` is passed as a thunk, not a value: it reads the session cookie,
  // and the vast majority of requests here are published assets whose answer
  // does not depend on who is asking. It runs only for the curation-queue trees.
  const served = await fetchServableFileBytes(
    fetch,
    API_BASE,
    fetchHeaders,
    id,
    isOwner,
  );
  if (!served) {
    return NextResponse.json(
      { error: "File not found" },
      {
        status: REFUSAL_STATUS,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  const upstreamType = served.upstreamContentType;
  const upstreamBody = served.bytes;
  // Repair a generic/missing upstream mime by sniffing the bytes, so a file
  // uploaded as application/octet-stream (the browser DOWNLOADS those) still
  // renders as the HTML/image/etc. it actually is.
  const contentType = resolveContentType(upstreamType, upstreamBody) || "text/html";
  const isImage = contentType.toLowerCase().startsWith("image/");
  const body = isImage
    ? decodeBase64ImageValue(upstreamBody, contentType)
    : upstreamBody;

  // Incident class (2026-07-17): three times today `/api/file/<idA>` transiently
  // served id B's bytes, each self-healing on a cache-busted refetch. This route
  // keeps NO app-level cache (the upstream fetch above is `no-store`), so the
  // wrong bytes originate either upstream — `/tdata/Files('id')/$value`
  // (openpaw/temper) returning the wrong file under heavy concurrent load — or in
  // the Vercel CDN, and then get held for the short HTML cache window below. The
  // root cause is NOT in this route, so we don't "fix" it here; we (1) shrink the
  // wrongness window by dropping stale-while-revalidate for mutable HTML, and (2)
  // log a cheap integrity fingerprint so any recurrence is traceable in Vercel
  // logs — grep `[file-proxy]` and match the served title against the requested
  // id. Do NOT add an app cache here to "help"; that would only lengthen the
  // window an anomaly persists.
  if (!isImage && contentType.toLowerCase().startsWith("text/html")) {
    const head = new TextDecoder("utf-8", { fatal: false }).decode(
      new Uint8Array(body).subarray(0, 4096),
    );
    const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1].trim();
      console.log(
        `[file-proxy] id=${id} titleLen=${title.length} byteLength=${body.byteLength}`,
      );
    }
  }
  // Cache directives and the owner-only `Vary` live in `fileResponseHeaders` so
  // they are decided by a function a test can execute. Asserting them against
  // this file's source let three regressions through — a deleted `Vary: Cookie`,
  // an added shared `CDN-Cache-Control` on the owner path, and a 404 turned 403.
  const responseHeaders = new Headers(
    fileResponseHeaders({
      visibility: served.visibility,
      contentType,
      isImage,
      byteLength: body.byteLength,
    }),
  );

  return new NextResponse(body, {
    headers: responseHeaders,
  });
}
