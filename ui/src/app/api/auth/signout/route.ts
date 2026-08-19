import { NextRequest, NextResponse } from "next/server";
import { expireSessionCookies } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

// POST only — a GET would let a prefetch or <img> end a session.
export async function POST(req: NextRequest) {
  const accept = req.headers.get("accept") ?? "";
  const res = accept.includes("text/html")
    ? NextResponse.redirect(new URL("/", req.nextUrl.origin), 303)
    : NextResponse.json(
        { ok: true },
        { headers: { "Cache-Control": "no-store" } },
      );
  expireSessionCookies(
    res.cookies,
    req.nextUrl.hostname,
    req.nextUrl.protocol === "https:",
  );
  return res;
}
