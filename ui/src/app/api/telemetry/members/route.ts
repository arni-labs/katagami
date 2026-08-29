import { NextResponse } from "next/server";
import { countMembers } from "@/lib/oauth-as";
import { authorizeCronRequest, emitServerEvent, serverTelemetryEnabled } from "@/lib/server-telemetry";

export const dynamic = "force-dynamic";

// Daily registered-members snapshot (ARN-436), fired by the Vercel cron in
// ui/vercel.json. Sign-ins also report members_total, but on a day with zero
// sign-ins the "total registered users" tile would go stale — this keeps it
// fed with one datapoint per day.
//
// Access: CRON_SECRET MUST be set in Vercel (Production + Preview) before
// this route exists on master. Vercel's cron caller sends
// `Authorization: Bearer <CRON_SECRET>` automatically. Unset secret, missing
// bearer, or a wrong bearer → 401 with no members_total. Howl/Rita set the
// secret; this route does not invent one and does not stay open for "local
// dev" when the secret is absent.
const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req: Request) {
  if (!authorizeCronRequest(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return unauthorized();
  }
  try {
    const membersTotal = await countMembers();
    await emitServerEvent("members_snapshot", { members_total: membersTotal });
    return NextResponse.json({
      ok: true,
      members_total: membersTotal,
      emitted: serverTelemetryEnabled(),
    });
  } catch (err) {
    console.error("[telemetry] members snapshot failed:", err);
    return NextResponse.json({ ok: false, error: "count failed" }, { status: 502 });
  }
}
