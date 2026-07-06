"use client";

import { useActionState } from "react";
import { mintHeadlessGrant, type MintResult } from "./actions";

// Pre-authorized grants for agents that can't click a consent screen
// (CI, cron). The refresh token appears exactly once — copy it or lose it.

export default function HeadlessMint() {
  const [result, formAction, pending] = useActionState<MintResult, FormData>(
    mintHeadlessGrant,
    null,
  );

  return (
    <div className="mt-14">
      <h2 className="text-xl font-semibold tracking-tight mb-3">
        Headless agent access
      </h2>
      <p className="text-[17px] leading-relaxed text-neutral-700 max-w-xl mb-6">
        For agents that run without a browser (CI, schedulers): pre-authorize a
        grant here instead of the consent screen. Same rules — it acts as you,
        submissions land in review, and revoking it below cuts it off.
      </p>
      <form action={formAction} className="flex flex-wrap items-center gap-4">
        <input
          type="text"
          name="label"
          placeholder="Name this agent (e.g. nightly-remixer)"
          className="rounded-2xl bg-neutral-100 px-5 py-3 text-[17px] w-80 outline-none focus:bg-neutral-200/70 transition-colors"
          maxLength={80}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-black text-white px-6 py-3 text-[17px] font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create grant"}
        </button>
      </form>
      {result?.ok === false && (
        <p className="mt-4 text-[17px] text-red-600">{result.error}</p>
      )}
      {result?.ok && (
        <div className="mt-6 rounded-2xl bg-neutral-100 p-6 max-w-xl">
          <p className="text-[17px] font-medium mb-2">
            Refresh token for “{result.label}” — shown once, copy it now.
          </p>
          <code className="block text-sm break-all select-all">
            {result.refreshToken}
          </code>
          <p className="mt-4 text-[15px] text-neutral-600 leading-relaxed">
            The agent exchanges it for short-lived access tokens at{" "}
            <code>/api/oauth/token</code> (grant_type=refresh_token). Each
            exchange rotates the token; treat the newest one as current.
          </p>
        </div>
      )}
    </div>
  );
}
