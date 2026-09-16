import fs from 'fs'; import { chromium } from 'playwright';
const css = fs.readFileSync('_common.css','utf8');
const b = await chromium.launch({headless:true});
const ctx = await b.newContext({viewport:{width:1270,height:760}, deviceScaleFactor:2});
for (const name of ['Cover','Main','ArtStyles','Mcp']){
  const src = fs.readFileSync(`${name}.dc.html`,'utf8');
  const body = src.split('</helmet>')[1].split('</x-dc>')[0];
  fs.writeFileSync(`_p_${name}.html`, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`);
  const p = await ctx.newPage();
  await p.goto('file://'+process.cwd()+`/_p_${name}.html`, {waitUntil:'networkidle'});
  await p.waitForTimeout(1500);
  await p.locator('.sheet').screenshot({path:`out-${name}.png`});
  await p.close();
}
await b.close(); console.log('rendered 3');
