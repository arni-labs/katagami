// Token interop contract (ARN-255): the tokens the katagami authorization
// server mints must carry exactly the claims the Temper kernel resolver reads
// (temper claude/arn-255-kernel-token-verification). Source-greps in the style
// of check-auth-contract.mjs — these lock the claim shape so the two repos
// cannot silently drift apart.
//
// Kernel contract (crates/temper-server/src/identity/{jwt,resolver}.rs):
//   - agent_type present  -> Agent acting for `sub`, type = agent_type
//   - agent_type absent    -> Customer principal = `sub`
//   - `role`               -> principal role (Cedar)
//   - `auth_generation`    -> sign-out-everywhere check, keyed on `sub`
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(path) {
  return readFileSync(resolve(path), "utf8");
}

const as = read("src/lib/oauth-as.ts");
const mcp = read("../mcp/src/temper.ts");
const agentsActions = read("src/app/(site)/account/agents/actions.ts");
const humanBearer = read("src/lib/human-bearer.ts");
const mutations = read("src/lib/odata-mutations.ts");
const remixActions = read("src/app/remix-actions.ts");
const remixSpec = read("../katagami-commons/specs/remix.ioa.toml");

// Isolate each mint function so a claim in one is not credited to the other.
function fnBody(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  if (start === -1) return "";
  // Body ends at the next top-level `export ` after the signature.
  const rest = source.slice(start + name.length);
  const next = rest.indexOf("\nexport ");
  return next === -1 ? rest : rest.slice(0, next);
}

const human = fnBody(as, "issueHumanToken");
const agent = fnBody(as, "issueAccessToken");

const required = [
  // Human token → Customer: carries sub/role/generation, NOT agent identity.
  ["human token sets the subject", human, /setSubject\(p\.sub\)/],
  ["human token carries role", human, /\brole\b/],
  ["human token carries auth_generation", human, /auth_generation/],
  [
    "human token omits agent_type/client_id (so the kernel resolves Customer)",
    human,
    /^(?![\s\S]*(agent_type|client_id))[\s\S]*$/,
  ],

  // Agent token → Agent acting for human: keeps agent identity AND now carries
  // the owning human's role + generation so sign-out-everywhere reaches it.
  ["agent token declares agent_type contributor", agent, /agent_type: "contributor"/],
  ["agent token carries client_id", agent, /client_id: p\.client_id/],
  ["agent token carries role", agent, /\brole,/],
  ["agent token carries auth_generation", agent, /auth_generation: generation/],

  // Generation is the kernel-owned counter (option A), read + advanced via the
  // PrincipalGeneration entity — not stored on Member.
  ["generation is read from the kernel PrincipalGeneration entity", as, /PrincipalGenerations\('/],
  ["sign-out-everywhere bumps the kernel generation", as, /BumpGeneration/],
  ["account exposes a sign-out-everywhere action", agentsActions, /signOutEverywhere[\s\S]*?bumpGeneration/],

  // Adapter forwards the caller's own token when the rollout flag is on, and
  // drops the self-asserted principal headers on that path.
  ["adapter can forward the caller token", mcp, /forwardCallerToken && id\.token/],

  // Human-write routing: per-user mutations can carry the human's Customer
  // token (flag-gated), minted from the session — not the shared service key.
  ["human bearer is flag-gated", humanBearer, /KATAGAMI_HUMAN_TOKENS/],
  ["human bearer is minted from the session via issueHumanToken", humanBearer, /getUser\(\)[\s\S]*issueHumanToken/],
  ["mutations accept a per-call bearer override", mutations, /function authHeaders\(bearer/],
  ["public reads stay on the service key (routing note present)", humanBearer, /does NOT touch public catalog reads/],
  ["rateRemix carries the human bearer", remixActions, /humanBearer\(\)[\s\S]*dispatchAction\("Remixes", id, "Rate"/],

  // Spec-declared authorization is actually used on a real action (reference).
  ["remix Rate declares requires = creator", remixSpec, /name = "Rate"[\s\S]*?requires = "creator"/],
];

let failed = 0;
for (const [name, source, pattern] of required) {
  if (pattern.test(source)) {
    console.log(`ok: ${name}`);
  } else {
    console.error(`MISSING: ${name}`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} token contract check(s) failed.`);
  process.exit(1);
}
console.log("\ntoken interop contract holds.");
