import { writeFileSync } from 'node:fs';

const base = process.env.TEMPER_API_URL;
const tenant = process.env.TEMPER_TENANT || 'default';
const key = process.env.TEMPER_API_KEY;

const rows = [];
let url = `${base}/tdata/EncyclopediaCells?$top=1000`;
while (url) {
  const res = await fetch(url, {
    headers: { 'X-Tenant-Id': tenant, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!res.ok) { console.error('HTTP', res.status, await res.text()); process.exit(1); }
  const body = await res.json();
  rows.push(...(body.value || []));
  const next = body['@odata.nextLink'];
  url = next ? (next.startsWith('http') ? next : `${base}/${next.replace(/^\//, '')}`) : null;
}
writeFileSync('./cells-raw.json', JSON.stringify(rows, null, 2));
console.log('rows', rows.length);
