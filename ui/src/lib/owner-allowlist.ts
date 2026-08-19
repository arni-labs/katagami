// Pure allowlist matching for owner mode. Kept free of `server-only` so
// the contract test can exercise the same rules the server uses.

export type OwnerAllowlist = {
  subs: string[];
  emails: string[];
};

export type OwnerIdentity = {
  sub: string;
  email: string;
};

function normalizeToken(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}

function splitList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[\n,]+/)
    .map(normalizeToken)
    .filter(Boolean);
}

/** `KATAGAMI_OWNER_SUBS` may contain subject ids and emails. */
export function parseOwnerAllowlist(
  subsRaw: string | undefined,
  emailsRaw?: string | undefined,
): OwnerAllowlist {
  const subs: string[] = [];
  const emails: string[] = [];
  for (const token of splitList(subsRaw)) {
    if (token.includes("@")) emails.push(token.toLowerCase());
    else subs.push(token);
  }
  for (const token of splitList(emailsRaw)) {
    emails.push(token.toLowerCase());
  }
  return { subs, emails };
}

export function sessionMatchesOwner(
  user: OwnerIdentity,
  allowlist: OwnerAllowlist,
): boolean {
  if (user.sub && allowlist.subs.includes(user.sub)) return true;
  const email = user.email.trim().toLowerCase();
  return Boolean(email && allowlist.emails.includes(email));
}
