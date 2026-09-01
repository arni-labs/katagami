import { NextResponse } from "next/server";
import { countMembers } from "@/lib/oauth-as";
import {
  authorizeCronRequest,
  emitServerEvent,
} from "@/lib/server-telemetry";

export const dynamic = "force-dynamic";

// Daily registered-members snapshot (ARN-436), fired by the Vercel cron in
// ui/vercel.json. Sign-ins also emit a members_snapshot (source:login), but
// on a day with zero sign-ins the "total registered users" tile would go
// stale — this keeps it fed with one datapoint per day (source:cron).
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
    // countMembers self-bounds (COUNT_MEMBERS_TIMEOUT_MS) and the intake
    // fetch aborts at 2.5s, so this route can afford to await BOTH and
    // report reality. `emitted` means Datadog accepted the event — a
    // revoked DD_API_KEY reads emitted:false here, not green forever.
    const membersTotal = await countMembers();
    const emitted = await emitServerEvent("members_snapshot", {
      members_total: membersTotal,
      source: "cron",
    });
    return NextResponse.json({
      ok: true,
      members_total: membersTotal,
      emitted,
    });
  } catch (err) {
    console.error("[telemetry] members snapshot failed:", err);
    return NextResponse.json({ ok: false, error: "count failed" }, { status: 502 });
  }
}
