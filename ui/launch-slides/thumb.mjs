import fs from 'fs'; import { chromium } from 'playwright';
const css = fs.readFileSync('_common.css','utf8');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
.t{position:relative;width:240px;height:240px;overflow:hidden;background:var(--washi);
   display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;}
</style></head><body>
<div class="t">
  <div class="dots" style="--wash-ink: var(--sakura); width:300px; height:300px; left:-120px; top:-130px;"></div>
  <div class="dots" style="--wash-ink: var(--ramune); width:260px; height:260px; right:-110px; bottom:-120px;"></div>
  <div class="grain"></div>
  <div style="position:relative;z-index:3;display:flex;gap:5px;">
    <i style="display:block;width:22px;height:22px;background:var(--sakura);mix-blend-mode:multiply;"></i>
    <i style="display:block;width:22px;height:22px;background:var(--yuzu);mix-blend-mode:multiply;"></i>
    <i style="display:block;width:22px;height:22px;background:var(--ramune);mix-blend-mode:multiply;"></i>
  </div>
  <div class="riso" data-text="型紙" style="--ink: var(--sakura); position:relative; z-index:3;
       font-family:'Bricolage Grotesque',sans-serif; font-size:78px; font-weight:800; line-height:1;">型紙</div>
  <div class="mono" style="position:relative;z-index:3;font-size:12px;letter-spacing:0.18em;">katagami</div>
</div></body></html>`;
fs.writeFileSync('_thumb.html', html);
const b = await chromium.launch({headless:true});
const p = await (await b.newContext({viewport:{width:240,height:240}, deviceScaleFactor:4})).newPage();
await p.goto('file://'+process.cwd()+'/_thumb.html', {waitUntil:'networkidle'});
await p.waitForTimeout(1500);
await p.locator('.t').screenshot({path:'out-thumb.png'});
await b.close(); console.log('thumb rendered');
