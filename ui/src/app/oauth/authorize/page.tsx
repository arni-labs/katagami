import { redirect } from "next/navigation";
import { getUser } from "@/lib/user-auth";
import { clientById, isAsConfigured } from "@/lib/oauth-as";
import { approveAuthorization, denyAuthorization } from "./actions";

// The consent screen — where a human turns an anonymous agent client into
// THEIR agent. Approving creates the AgentGrant; everything the agent later
// submits is attributed to this account, and this same grant is the kill
// switch on the Agents & access page.

export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : "";
}

function ErrorCard({ title, detail }: { title: string; detail: string }) {
  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center px-6">
      <div className="max-w-md w-full pt-10 pb-12">
        <p className="text-sm uppercase tracking-wide text-neutral-500 mb-6">
          Katagami
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mb-4">{title}</h1>
        <p className="text-[17px] leading-relaxed text-neutral-700">{detail}</p>
      </div>
    </main>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const clientId = one(sp.client_id);
  const redirectUri = one(sp.redirect_uri);
  const responseType = one(sp.response_type);
  const codeChallenge = one(sp.code_challenge);
  const challengeMethod = one(sp.code_challenge_method);
  const state = one(sp.state);
  const resource = one(sp.resource);

  if (!isAsConfigured()) {
    return (
      <ErrorCard
        title="Agent access is not available"
        detail="The authorization server is not configured on this deployment."
      />
    );
  }

  // Per OAuth rules: on an invalid client or redirect_uri we must render the
  // error, never bounce the browser to an unvalidated address.
  const client = clientId ? await clientById(clientId) : null;
  if (!client || !redirectUri || !client.redirect_uris.includes(redirectUri)) {
    return (
      <ErrorCard
        title="Unknown agent"
        detail="This authorization request doesn't match a registered agent client. Ask the agent to re-register and try again."
      />
    );
  }
  if (responseType !== "code" || !codeChallenge || challengeMethod !== "S256") {
    const back = new URL(redirectUri);
    back.searchParams.set("error", "invalid_request");
    if (state) back.searchParams.set("state", state);
    redirect(back.toString());
  }

  const user = await getUser();
  if (!user) {
    const here = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string") here.set(k, v);
    }
    redirect(`/api/auth/google/start?next=${encodeURIComponent(`/oauth/authorize?${here.toString()}`)}`);
  }

  return (
    <main className="min-h-screen bg-white text-black flex items-center justify-center px-6">
      <div className="max-w-md w-full pt-10 pb-12">
        <p className="text-sm uppercase tracking-wide text-neutral-500 mb-10">
          Katagami
        </p>
        <h1 className="text-3xl font-semibold tracking-tight mb-6">
          {client.client_name} wants to contribute to Katagami as you
        </h1>
        <p className="text-[17px] leading-relaxed text-neutral-700 mb-8">
          You are signed in as <span className="font-medium text-black">{user.name || user.email}</span>{" "}
          ({user.email}). If you approve, this agent can pull design languages,
          remix them, and submit work for review <span className="font-medium text-black">in your name</span>.
          Everything it submits is attributed to you, lands in review — never
          published directly — and you can revoke this access at any time from
          your account.
        </p>
        <div className="flex gap-4">
          <form action={approveAuthorization}>
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />
            <input type="hidden" name="code_challenge" value={codeChallenge} />
            <input type="hidden" name="resource" value={resource} />
            <button
              type="submit"
              className="rounded-2xl bg-black text-white px-7 py-3 text-[17px] font-medium hover:bg-neutral-800 transition-colors"
            >
              Approve
            </button>
          </form>
          <form action={denyAuthorization}>
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="state" value={state} />
            <button
              type="submit"
              className="rounded-2xl bg-neutral-100 text-black px-7 py-3 text-[17px] font-medium hover:bg-neutral-200 transition-colors"
            >
              Deny
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
