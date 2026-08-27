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
const session = read("src/lib/user-auth.ts");

// Every governed commons entity must close generic OData writes to contributors:
// PATCH/DELETE are authorized as the lowercase `update`/`delete` actions, which
// no named-action forbid covers, so without these a contributor could rewrite or
// delete content without ever invoking a governed action.
const GOVERNED = ["design_language","art_style","palette_system","writing_style","remix",
                  "taxonomy","direction","design_source","element_manifest","design_element"];
// Humans reaching the kernel are Customer principals, which no agent_type
// forbid ever matches — each curator-owned entity must gate them on role, and
// owner actions must carry the human's token so the kernel sees who is acting.
const CURATED = ["design_language","art_style","palette_system","writing_style","taxonomy","direction"];
const humanChecks = CURATED.map((stem) => [
  `${stem}.cedar gates curator actions on the human's role`,
  read(`../katagami-commons/policies/${stem}.cedar`),
  /unless \{[\s\S]*?\["owner", "curator"\]\.contains\(principal\.role\)/,
]).concat([
  // The identity substrate must be unreachable by humans and contributor
  // agents: a human who could invoke Member.SetRole would simply promote
  // themselves to owner and mint an owner token on their next sign-in.
  ...["member","agent_grant","oauth_client"].map((stem) => [
    `${stem}.cedar is closed to humans and contributor agents`,
    read(`../katagami-commons/policies/${stem}.cedar`),
    /unless \{ principal is System \|\| principal is Admin \|\| \(principal has agent_type && principal\.agent_type == "operator"\) \}/,
  ]),
  // Curation is pipeline/curator work, not open to every verified principal.
  ...["taste_rule","curation_job","curation_direction","curation_query"].map((stem) => [
    `${stem}.cedar is closed to humans and contributor agents`,
    read(`../katagami-curation/policies/${stem}.cedar`),
    /unless \{ action == Action::"read"[\s\S]*?principal is System/,
  ]),
  ["remix.cedar gates human ownership",
   read("../katagami-commons/policies/remix.cedar"),
   /context\.creator_sub == principal\.id/],
  ["owner/curator bearer helpers carry the acting human to the kernel",
   read("src/lib/owner.ts"), /assertOwnerBearer[\s\S]*humanBearer/],
  // Fail-closed contract (ARN-255): a signed-in write throws if the mint fails,
  // never coalesces null->undefined and falls back to the shared service key.
  ["assertOwnerBearer returns a string and fails closed",
   read("src/lib/owner.ts"),
   /assertOwnerBearer\(\): Promise<string>[\s\S]*?humanBearer\(\)[\s\S]*?throw new Error/],
  ["a curator predicate exists (owner OR curator)",
   read("src/lib/owner.ts"),
   /hasCuratorAccess[\s\S]*?=== "owner" \|\| role === "curator"/],
  ["assertCuratorBearer returns a string and fails closed",
   read("src/lib/owner.ts"),
   /assertCuratorBearer\(\): Promise<string>[\s\S]*?humanBearer\(\)[\s\S]*?throw new Error/],
  // The curation/review Server Actions carry the CURATOR's token — Cedar grants
  // these to owner|curator — and every one threads { bearer }, none the service key.
  ["curation server actions use assertCuratorBearer",
   read("src/app/actions.ts"), /assertCuratorBearer\(\)[\s\S]*\{ bearer \}/],
  ["curation Server Actions no longer route through assertOwnerBearer",
   read("src/app/actions.ts"), /^(?![\s\S]*assertOwnerBearer)[\s\S]*$/],
]);

// THE RECURRING BUG CLASS, made unrepeatable: a boundary written as
// `forbid ... when { <list of forbidden principals> }` permits every principal
// nobody thought to name — a typeless agent, a new principal kind, tomorrow's
// service. Twice in this effort that shape leaked (contributor-only lists let
// humans through; then human+contributor lists let a typeless agent through).
// Every boundary must instead be `forbid ... unless { <list of ALLOWED
// principals> }`, so an unnamed principal is denied by default.
const ALL_POLICIES = [
  ...GOVERNED.map((s) => `../katagami-commons/policies/${s}.cedar`),
  ...["member","agent_grant","oauth_client"].map((s) => `../katagami-commons/policies/${s}.cedar`),
  ...["taste_rule","curation_job","curation_direction","curation_query","curation_job_template"]
      .map((s) => `../katagami-curation/policies/${s}.cedar`),
];
const denyByDefaultChecks = ALL_POLICIES.map((rel) => [
  `${rel.split("/").pop()} states who is ALLOWED, never who is forbidden`,
  read(rel),
  /^(?![\s\S]*\nwhen \{)[\s\S]*$/,
]);

const crudChecks = GOVERNED.map((stem) => [
  `${stem}.cedar closes generic update/delete to all but privileged principals`,
  read(`../katagami-commons/policies/${stem}.cedar`),
  /Action::"update",\s*\n?\s*Action::"delete"[\s\S]*?unless \{[\s\S]*?principal is System/,
]);

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

  // Adapter ALWAYS forwards the caller's own token, and never self-asserts a
  // principal via headers (ARN-255): the mandatory path, not a flag.
  ["adapter always forwards the caller token", mcp, /Bearer \$\{id\.token\}/],
  ["adapter fails closed on a missing caller token", mcp, /if \(!id\.token\)[\s\S]*?throw new TemperError/],
  ["adapter headers never fall back to the service key", mcp, /^(?![\s\S]*Bearer \$\{config\.temperApiKey\})[\s\S]*$/],
  ["adapter never self-asserts a principal header", mcp, /^(?![\s\S]*x-temper-principal-)[\s\S]*$/],
  ["adapter forwarding is not flag-gated", mcp, /^(?![\s\S]*forwardCallerToken)[\s\S]*$/],

  // Human-write routing: per-user mutations ALWAYS carry the human's Customer
  // token, minted from the session — not the shared service key, no flag gate.
  ["human bearer is mandatory (no flag gate)", humanBearer, /^(?![\s\S]*KATAGAMI_HUMAN_TOKENS)[\s\S]*$/],
  ["human bearer is minted from the session via issueHumanToken", humanBearer, /getUser\(\)[\s\S]*issueHumanToken/],
  ["mutations accept a per-call bearer override", mutations, /function authHeaders\(bearer/],
  ["public reads stay on the service key (routing note present)", humanBearer, /does NOT touch public catalog reads/],
  ["rateRemix carries the human bearer", remixActions, /humanBearer\(\)[\s\S]*dispatchAction\("Remixes", id, "Rate"/],
  // Authoring writes (create + every dispatch) carry the human's own token too,
  // and fail closed — none run on the service key (ARN-255).
  ["saveRemix mints the human bearer and threads it through create + dispatch",
   remixActions,
   /saveRemix[\s\S]*?humanBearer\(\)[\s\S]*?createEntity\("Remixes", \{\}, \{ bearer \}\)[\s\S]*?"SetSelection"[\s\S]*?\{ bearer \}/],
  ["saveRemix fails closed on a missing bearer", remixActions,
   /saveRemix[\s\S]*?humanBearer\(\)[\s\S]*?if \(!bearer\)[\s\S]*?throw/],
  ["rateRemix fails closed on a missing bearer", remixActions,
   /rateRemix[\s\S]*?humanBearer\(\)[\s\S]*?if \(!bearer\)[\s\S]*?throw/],

  // Sign-out-everywhere must actually end sessions AND stop agents — the
  // generation bump alone leaves the session cookie live and lets agents
  // refresh straight back in.
  ["the session carries the generation it was minted at", session, /gen,/],
  // Rejects an out-of-date generation AND refuses when the counter cannot be
  // read — an unreadable revocation check must never read as "not revoked".
  ["session verification rejects an out-of-date generation", session, /currentGen === null \|\| sessionGen < currentGen/],
  ["sign-out drops the cached generation immediately", agentsActions, /forgetCachedGeneration\(user\.sub\)/],
  ["a failed user-token mint does not fall back to the service key", humanBearer, /throw new Error\([\s\S]*Could not verify your identity/],
  ["sign-out-everywhere also revokes live grants", agentsActions, /signOutEverywhere[\s\S]*grantsForMember[\s\S]*revokeGrant/],
  ["revoking a grant propagates to the kernel", as, /revokeGrant[\s\S]*?bumpGeneration\(grantId\)/],
  ...crudChecks,
  ...humanChecks,
  ...denyByDefaultChecks,
  // A role grants authority to the HUMAN holding it, never to an agent that
  // merely carries it for provenance — otherwise authorizing any MCP client
  // hands it your curator powers.
  ...["design_language","art_style","taxonomy"].map((stem) => [
    `${stem}.cedar grants role authority only to Customers`,
    read(`../katagami-commons/policies/${stem}.cedar`),
    /principal is Customer && principal has role/,
  ]),
  // Ownership covers EVERY mutating remix action, not a chosen few.
  ["remix.cedar ownership-gates every mutating action",
   read("../katagami-commons/policies/remix.cedar"),
   /Action::"SetSelection",[\s\S]*?Action::"SetSlotAssignments",[\s\S]*?Action::"AttachBrief",[\s\S]*?Action::"Save"/],
  ...["SubmitWritingStyle","SetName","SetMechanicalBands","SetSources","SetTags","SetCredits","SetModelProvenance","SetCrossModal","AttachThumbnail","SetExemplars"].map((act) => [
    `writing_style.cedar gates ${act} (owner|curator|service only)`,
    read("../katagami-commons/policies/writing_style.cedar"),
    new RegExp(`Action::"${act}"[\\s\\S]*?unless \\{[\\s\\S]*?\\["owner", "curator"\\]`),
  ]),
  ...["design_language","art_style","palette_system"].map((stem) => [
    `${stem}.cedar ReturnToDraft permits the creator with the empty-actingFor guard`,
    read(`../katagami-commons/policies/${stem}.cedar`),
    /action == Action::"ReturnToDraft"[\s\S]*?context\.creator_sub == principal\.id[\s\S]*?context\.actingFor != ""/,
  ]),
  // ARN-315: the artifact policies gated advancement but left AUTHORING on the
  // base grant, so any Customer could edit/submit another contributor's draft.
  // Each artifact must carry the broad creator-scoped forbid — an unqualified
  // `forbid(principal, action, ...)` that permits only the creator, owner/
  // curator, or a service agent. The cedarpy suite proves the decisions; this
  // fails fast in `npm test` if the clause is deleted.
  ...["design_language","art_style","palette_system"].map((stem) => [
    `${stem}.cedar creator-scopes every remaining authoring action (ARN-315)`,
    read(`../katagami-commons/policies/${stem}.cedar`),
    /forbid\(principal, action, resource is \w+\)\s*\nunless \{ action == Action::"read"[\s\S]*?context\.creator_sub == principal\.id/,
  ]),
  // Attribution is curator/pipeline-only: SetCredits/SetModelProvenance reach
  // Published, so a creator must not rewrite them on their own published record.
  ...["design_language","art_style","palette_system"].map((stem) => [
    `${stem}.cedar routes SetCredits/SetModelProvenance to owner|curator|service`,
    read(`../katagami-commons/policies/${stem}.cedar`),
    /Action::"SetCredits",[\s\S]*?Action::"SetModelProvenance",[\s\S]*?unless \{[\s\S]*?\["owner", "curator"\]/,
  ]),
  // feedback_response was a bare `permit(principal, action, ...)` — the ARN-315
  // hole in its simplest form. It must now forbid all but service/owner/curator.
  ["feedback_response.cedar is no longer an open grant (ARN-315)",
   read("../katagami-commons/policies/feedback_response.cedar"),
   /forbid\(principal, action, resource is FeedbackResponse\)\s*\nunless \{[\s\S]*?\["owner", "curator"\]/],
  // The kernel injects entity state into Cedar CONTEXT, not onto the resource
  // entity (temper-server/src/odata/bindings.rs → temper-authz engine). A
  // creator-scoping clause written as `resource.creator_sub` is DEAD in
  // production — it silently drops to the fail-open/over-deny branch (remix
  // ownership was fully bypassed this way). Every ownership clause reads
  // `context.creator_sub`; a `resource.creator_sub` in commons is the bug.
  ...["design_language","art_style","palette_system","remix"].map((stem) => [
    `${stem}.cedar reads context.creator_sub, never the dead resource.creator_sub`,
    read(`../katagami-commons/policies/${stem}.cedar`),
    /^(?![\s\S]*resource\.creator_sub)(?![\s\S]*resource has creator_sub)[\s\S]*context\.creator_sub == principal\.id/,
  ]),
];

// EACH human-attributed governed write must carry { bearer } — not just "some
// bearer occurs somewhere". Assert per-file that every mutation call
// (dispatchAction/createEntity) is bearer-carrying, so dropping the bearer from
// SetCreator/Save/AttachCorpus/CurationJob-create fails this contract.
const BEARER_WRITE_FILES = {
  "src/app/remix-actions.ts": read("src/app/remix-actions.ts"),
  "src/app/(site)/voice/actions.ts": read("src/app/(site)/voice/actions.ts"),
  "src/app/(site)/account/submission-actions.ts": read("src/app/(site)/account/submission-actions.ts"),
};
for (const [file, src] of Object.entries(BEARER_WRITE_FILES)) {
  const mutations = (src.match(/\b(?:dispatchAction|createEntity|uploadFile)\s*\(/g) || []).length;
  const bearers = (src.match(/\{ bearer \}/g) || []).length;
  required.push([
    `${file}: every governed write carries { bearer } (${bearers}/${mutations})`,
    src,
    new RegExp(`^${mutations === bearers ? "" : "(?!)"}[\\s\\S]*$`),
  ]);
}

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
