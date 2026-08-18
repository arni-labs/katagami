import "server-only";
import { importJWK, jwtVerify } from "jose";
import { publicJwks, isAsConfigured } from "./oauth-as";

// Verify an MCP bearer for the READ tier. Any token signed by our own AS key
// (ARN-151) = an authenticated Katagami user → full-catalog access. We don't
// require a specific audience/scope here: presence of a valid user token is
// the whole signal (anonymous callers simply get the sample tier).

export type ReadIdentity = { sub: string; email: string };

export async function verifyReadBearer(token: string): Promise<ReadIdentity | null> {
  if (!isAsConfigured()) return null;
  try {
    const { keys } = await publicJwks();
    if (!keys.length) return null;
    const key = await importJWK(keys[0], "ES256");
    const { payload } = await jwtVerify(token, key, { algorithms: ["ES256"] });
    const sub = String(payload.sub ?? "");
    if (!sub) return null;
    return { sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}
