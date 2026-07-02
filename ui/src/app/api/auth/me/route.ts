import { NextResponse } from "next/server";
import { getUser } from "@/lib/user-auth";

// The header identity chip reads the session from here, client-side, so the
// shared (site) layout never touches cookies() — keeping /language/[id],
// /taxonomy, and friends in the full-route cache.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  return NextResponse.json(
    {
      user: user
        ? { name: user.name, email: user.email, picture: user.picture }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
