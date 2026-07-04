import { NextResponse } from "next/server";
import { getUser } from "@/lib/user-auth";
import { isOwner } from "@/lib/owner";

// The header identity chip reads the session from here, client-side, so the
// shared (site) layout never touches cookies() — keeping /language/[id],
// /taxonomy, and friends in the full-route cache.
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  const owner = await isOwner();
  return NextResponse.json(
    {
      user: user
        ? { name: user.name, email: user.email, picture: user.picture }
        : null,
      owner,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
