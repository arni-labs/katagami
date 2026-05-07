import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";
const DEFAULT_CACHE_CONTROL = "public, max-age=3600";
const IMAGE_BROWSER_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800";
const IMAGE_VERCEL_CACHE_CONTROL = "public, max-age=31536000, immutable";

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
  const body = res.body ?? (await res.arrayBuffer());
  const responseHeaders = new Headers({
    "Content-Type": contentType,
    "Cache-Control": isImage
      ? IMAGE_BROWSER_CACHE_CONTROL
      : DEFAULT_CACHE_CONTROL,
  });
  const contentLength = res.headers.get("content-length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  if (isImage) {
    responseHeaders.set("Vercel-CDN-Cache-Control", IMAGE_VERCEL_CACHE_CONTROL);
  }

  return new NextResponse(body, {
    headers: responseHeaders,
  });
}
