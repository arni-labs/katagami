import { NextResponse } from "next/server";
import { countMembers } from "@/lib/oauth-as";
import { emitServerEvent, serverTelemetryEnabled } from "@/lib/server-telemetry";

export const dynamic = "force-dynamic";

// Daily registered-members snapshot (ARN-436), fired by the Vercel cron in
// ui/vercel.json. Sign-ins also report members_total, but on a day with zero
// sign-ins the "total registered users" tile would go stale — this keeps it
// fed with one datapoint per day.
//
// The count itself is a single non-sensitive number (no ids, no emails). When
// CRON_SECRET is set in Vercel, Vercel's cron caller sends it as a bearer and
// everyone else is rejected; without it the route stays callable but only
// emits one log line per call.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
