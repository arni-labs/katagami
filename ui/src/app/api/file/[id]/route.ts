import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";
const DEFAULT_CACHE_CONTROL = "public, max-age=3600";
const IMAGE_BROWSER_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800";
const IMAGE_VERCEL_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800";

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

  const contentType = res.headers.get("content-type") || "text/html";
  const isImage = contentType.startsWith("image/");
  const upstreamBody = await res.arrayBuffer();
  const body = decodeBase64ImageValue(upstreamBody, contentType);
  const responseHeaders = new Headers({
    "Content-Type": contentType,
    "Cache-Control": isImage
      ? IMAGE_BROWSER_CACHE_CONTROL
      : DEFAULT_CACHE_CONTROL,
  });
  responseHeaders.set("Content-Length", String(body.byteLength));
  if (isImage) {
    responseHeaders.set("Vercel-CDN-Cache-Control", IMAGE_VERCEL_CACHE_CONTROL);
  }

  return new NextResponse(body, {
    headers: responseHeaders,
  });
}
