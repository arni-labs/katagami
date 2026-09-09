// Whether a citation can be fetched, and what happened when it was tried.
//
// This is the loader's own gate, moved out so that anything asking "can this
// page be cited?" asks the question the loader will actually ask. A second
// implementation would answer a slightly different question the moment either
// side changed, and a check that excuses a row on the strength of a different
// request is not checking the thing it reports on.
//
// A source is reachable when it answers on its own host. A citation must point
// at the public web. The fetch says what it accepts, machine representations
// first, so a linked-data host answers with the record it serves to scripts and
// a web page host answers as usual; same-host redirects are followed. Loopback,
// private, and link-local addresses are refused for the URL and for every
// redirect hop, so a source cannot steer the runner into something on its own
// network.
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export const FETCHED = "fetched";

export function privateAddress(address) {
  if (isIP(address) === 6) {
    // An IPv4-mapped address arrives either dotted (::ffff:10.0.0.1) or, after
    // URL canonicalisation, as two hex groups (::ffff:a00:1); judge both as IPv4.
    const mapped = address.match(/^::ffff:(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/i);
    if (mapped) {
      if (mapped[1]) return privateAddress(mapped[1]);
      const [hi, lo] = [parseInt(mapped[2], 16), parseInt(mapped[3], 16)];
      return privateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    // Loopback, unspecified, unique-local, link-local, multicast.
    return /^(::1|::)$/i.test(address) || /^(f[cd][0-9a-f]{2}:|fe[89ab][0-9a-f]:|ff[0-9a-f]{2}:)/i.test(address);
  }
  const [a, b] = address.split(".").map(Number);
  // 100.64.0.0/10 is carrier-grade NAT, which Tailscale uses for its hosts.
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

export async function publicHost(url, resolve = lookup) {
  const { protocol, hostname: rawHostname } = new URL(url);
  // URL keeps the brackets on an IPv6 literal; isIP does not want them.
  const hostname = rawHostname.replace(/^\[|\]$/g, "");
  if (protocol !== "https:") return `not https (${protocol})`;
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) return `local hostname ${hostname}`;
  const addresses = isIP(hostname) ? [{ address: hostname }] : await resolve(hostname, { all: true });
  const bad = addresses.find(({ address }) => privateAddress(address));
  return bad ? `${hostname} resolves to a private address ${bad.address}` : "";
}

// Returns "fetched" when the page answered, and otherwise says what stopped it.
// `deps` exists so a test can drive every branch without a network.
export async function fetchVerdict(url, deps = {}) {
  const { fetch: get = fetch, resolve = lookup } = deps;
  let verdict = FETCHED;
  try {
    let at = url;
    verdict = "too many redirects";
    for (let hop = 0; hop < 5; hop++) {
      const refused = await publicHost(at, resolve);
      if (refused) { verdict = refused; break; }
      const response = await get(at, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(30_000), headers: { "User-Agent": "Mozilla/5.0 (compatible; katagami-encyclopedia-verifier)", Accept: "application/json, text/html;q=0.9, */*;q=0.8" } });
      if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
        const next = new URL(response.headers.get("location"), at);
        if (next.host !== new URL(url).host) { verdict = `redirected off-site to ${next.host}`; break; }
        at = next.href; continue;
      }
      verdict = response.ok ? FETCHED : `HTTP ${response.status}`;
      break;
    }
  } catch (error) { verdict = `unreachable (${error.name})`; }
  return verdict;
}
