import assert from "node:assert/strict";
const { fetchVerdict, mediaWikiProbe, FETCHED } = await import("../../scripts/encyclopedia-source-fetch.mjs");
const resolve = async () => [{ address: "151.101.0.1" }];
const H = { get: () => null };

assert.equal(mediaWikiProbe("https://aesthetics.fandom.com/wiki/Afropunk"),
  "https://aesthetics.fandom.com/api.php?action=query&format=json&titles=Afropunk");
assert.equal(mediaWikiProbe("https://example.com/not-a-wiki"), null);
console.log("ok: builds the api probe only for /wiki/<Title> URLs");

// 403 on the page, page exists in the API -> fetched
let v = await fetchVerdict("https://aesthetics.fandom.com/wiki/Afropunk", { resolve, fetch: async (u) =>
  u.includes("/api.php") ? { ok: true, status: 200, headers: H, json: async () => ({ query: { pages: { "1": { pageid: 1, title: "Afropunk" } } } }) }
                         : { ok: false, status: 403, headers: H } });
assert.equal(v, FETCHED, `expected fetched, got ${v}`);
console.log("ok: 403 page + API says it exists -> fetched");

// MUTATION: 403 page, API says the page is MISSING -> stays failed
v = await fetchVerdict("https://aesthetics.fandom.com/wiki/Nope", { resolve, fetch: async (u) =>
  u.includes("/api.php") ? { ok: true, status: 200, headers: H, json: async () => ({ query: { pages: { "-1": { missing: "" } } } }) }
                         : { ok: false, status: 403, headers: H } });
assert.equal(v, "HTTP 403", `a missing page must stay failed, got ${v}`);
console.log("ok: 403 page + API says missing -> still fails (the gate still bites)");

// A 404 must NOT take the fallback at all
let apiCalls = 0;
v = await fetchVerdict("https://aesthetics.fandom.com/wiki/Gone", { resolve, fetch: async (u) => {
  if (u.includes("/api.php")) { apiCalls++; return { ok: true, status: 200, headers: H, json: async () => ({ query: { pages: { "1": {} } } }) }; }
  return { ok: false, status: 404, headers: H }; } });
assert.equal(v, "HTTP 404");
assert.equal(apiCalls, 0, "a 404 must not be rescued by the API");
console.log("ok: a real 404 is never rescued");
