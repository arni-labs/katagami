import { redirect } from "next/navigation";
import { getUser } from "@/lib/user-auth";
import { grantsForMember } from "@/lib/oauth-as";
import { revokeAgentGrant, signOutEverywhere } from "./actions";
import HeadlessMint from "./HeadlessMint";

// Agents & access — the human agency surface for identity (ARN-151): every
// grant your agents hold, who they are, and the revoke switch. "Agents act,
// humans own" is only true if this page exists.

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/api/auth/google/start?next=%2Faccount%2Fagents");
  }

  const grants = (await grantsForMember(user.sub)).sort((a, b) =>
    a.status === b.status ? 0 : a.status === "Active" ? -1 : 1,
  );
  const active = grants.filter((g) => g.status === "Active");
  const revoked = grants.filter((g) => g.status !== "Active");

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24">
      <div className="pt-16 pb-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Agents &amp; access
        </h1>
      </div>
      <p className="text-[17px] leading-relaxed text-neutral-700 max-w-xl">
        Agents you have allowed to contribute to Katagami as{" "}
        <span className="font-medium text-black">{user.email}</span>. They
        author and submit in your name; only curators publish. Revoking a grant
        cuts the agent off within minutes.
      </p>

      <div className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight mb-5">
          Active grants
        </h2>
        {active.length === 0 ? (
          <p className="text-[17px] text-neutral-500">
            No agents yet. Connect one to the Katagami MCP server and approve
            it on the consent screen, or create a headless grant below.
          </p>
        ) : (
          <ul className="space-y-4">
            {active.map((g) => (
              <li
                key={g.grantId}
                className="rounded-2xl bg-neutral-50 px-6 py-5 flex items-center justify-between gap-6"
              >
                <div>
                  <p className="text-[17px] font-medium">{g.clientName}</p>
                  <p className="text-[15px] text-neutral-500">
                    {g.grantKind === "pre_authorized"
                      ? "Headless grant"
                      : "Approved on the consent screen"}
                  </p>
                </div>
                <form action={revokeAgentGrant}>
                  <input type="hidden" name="grant_id" value={g.grantId} />
                  <button
                    type="submit"
                    className="rounded-2xl bg-white px-5 py-2.5 text-[15px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Revoke
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <HeadlessMint />

      {revoked.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight mb-5 text-neutral-500">
            Revoked
          </h2>
          <ul className="space-y-2">
            {revoked.map((g) => (
              <li key={g.grantId} className="text-[15px] text-neutral-400 px-1">
                {g.clientName}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-16 pt-8">
        <h2 className="text-xl font-semibold tracking-tight mb-2">
          Sign out everywhere
        </h2>
        <p className="text-[15px] text-neutral-500 mb-5 max-w-xl">
          Ends every active session — yours and every agent acting for you — on
          all devices. New sign-ins are unaffected. Takes effect within a
          minute.
        </p>
        <form action={signOutEverywhere}>
          <button
            type="submit"
            className="rounded-full bg-black text-white text-[15px] font-medium px-5 py-2.5 hover:bg-neutral-800 transition-colors"
          >
            Sign out everywhere
          </button>
        </form>
      </div>
    </main>
  );
}
