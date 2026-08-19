import { NextRequest, NextResponse } from "next/server";
import { appendExpiredSessionCookies } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

function signedOut(req: NextRequest, html: boolean): NextResponse {
  const res = html
    ? new NextResponse(
        `<!doctype html><meta http-equiv="refresh" content="0;url=/"><p>Signed out.</p>`,
        {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      )
    : NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", "no-store");
  // 200 + Clear-Site-Data is what actually drops cookies in Chromium;
  // a 303 redirect often ignores it.
  res.headers.set("Clear-Site-Data", '"cookies"');
  appendExpiredSessionCookies(
    res.headers,
    req.nextUrl.hostname,
    req.nextUrl.protocol === "https:",
  );
  return res;
}

// POST only — a GET would let a prefetch or <img> end a session.
export async function POST(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  return signedOut(req, accept.includes("text/html") || !accept.includes("json"));
}
