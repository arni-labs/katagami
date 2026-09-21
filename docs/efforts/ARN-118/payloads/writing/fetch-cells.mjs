// Reads every EncyclopediaCells row into ./cells-raw.json.
//
// Two rules about the paging continuation, both learned the hard way.
//
// It carries the tenant bearer token, so it may only ever be followed to the
// API's own origin. `@odata.nextLink` is a value the server chooses, and a
// client that follows it wherever it points will hand the credential to
// whatever host is named. Any other origin is refused, loudly — never skipped,
// because a skipped page is a short read that still looks like a whole one.
//
// A relative continuation resolves against the CURRENT request URL, not the API
// root. The server returns `EncyclopediaCells?$skiptoken=...` with no leading
// slash and no `/tdata/`, so resolving it against the root drops the path
// segment and asks for something that does not exist. The same mistake
// truncated two other reads in this collection.
import { writeFileSync } from 'node:fs';

const base = process.env.TEMPER_API_URL;
const tenant = process.env.TEMPER_TENANT || 'default';
const key = process.env.TEMPER_API_KEY;
if (!base) throw new Error('TEMPER_API_URL is required');
if (!key) throw new Error('TEMPER_API_KEY is required');

const apiOrigin = new URL(base).origin;

function nextUrl(next, current) {
  // Resolve against the current request URL: absolute links pass through, and a
  // relative one keeps the path it was served from.
  const resolved = new URL(next, current);
  if (resolved.origin !== apiOrigin) {
    throw new Error(
      `refusing to follow @odata.nextLink to ${resolved.origin}: the read carries the tenant bearer token ` +
      `and may only go to ${apiOrigin}`,
    );
  }
  return resolved.toString();
}

const rows = [];
let url = `${base}/tdata/EncyclopediaCells?$top=1000`;
let pages = 0;
while (url) {
  const res = await fetch(url, {
    headers: { 'X-Tenant-Id': tenant, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) { console.error('HTTP', res.status, await res.text()); process.exit(1); }
  const body = await res.json();
  rows.push(...(body.value || []));
  pages += 1;
  const next = body['@odata.nextLink'];
  url = next ? nextUrl(next, url) : null;
}
writeFileSync('./cells-raw.json', JSON.stringify(rows, null, 2));
console.log('rows', rows.length, `(${pages} page${pages === 1 ? '' : 's'})`);
