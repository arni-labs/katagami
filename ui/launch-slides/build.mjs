import fs from 'fs';
const css = fs.readFileSync('_common.css','utf8');
const wrap = (b) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
${css}
  </style>
</helmet>
${b}
</x-dc>
</body>
</html>
`;
const head = (no) => `  <div class="head">
    <div class="reg"><i style="background: var(--sakura)"></i><i style="background: var(--yuzu)"></i><i style="background: var(--ramune)"></i></div>
    <span class="mono">katagami</span>
    <span class="spacer"></span>
    <span class="mono">${no}</span>
  </div>`;
const press = (fields) => fields.map(f=>`  <div class="dots" style="--wash-ink: var(--${f.ink}); width:${f.d}px; height:${f.d}px; ${f.pos}"></div>`).join('\n');
const mkWord = (h, m) => {
  if (!m) return h;
  if (/\s/.test(m[0])) throw new Error(`marker must be a single word (got "${m[0]}")`);
  return h.replace(m[0], `<span class="mk" style="--mk: var(--${m[1]})">${m[0]}<i></i></span>`);
};
const turned = ({img, alt, deg, ink, tapeInk, tapeCss}) => `    <div class="turn">
      <div style="position: relative; width: 100%; transform: rotate(${deg}deg);">
        <div class="pass" style="background: var(--${ink}); transform: translate(13px, 15px);"></div>
        <div class="tape" style="--strip-ink: var(--${tapeInk}); ${tapeCss}"></div>
        <img class="plate" src="${img}" alt="${alt}">
      </div>
    </div>`;
const slide = ({no, fields, stampInk, stamp, headline, headInk, mark, lede, foot, plate}) => wrap(`<div class="sheet">
${press(fields)}
  <div class="grain"></div>
${head(no)}
  <div class="body">
    <div class="col">
      <span class="stamp" style="--ink: var(--${stampInk}); align-self: flex-start;">${stamp}</span>
      <div class="riso" data-text="${headline}" style="--ink: var(--${headInk}); font-size: 50px;">${mkWord(headline, mark)}</div>
      <div class="lede">${lede}</div>
    </div>
${plate}
  </div>
  <div class="foot">
    <div class="rule" style="flex-grow: 1;"></div>
    <span class="mono">${foot}</span>
  </div>
</div>`);

// 01 — the gallery
fs.writeFileSync('Main.dc.html', slide({
  no:'THE GALLERY',
  fields:[{ink:'sakura',d:760,pos:'left:-320px; top:-280px;'},{ink:'yuzu',d:620,pos:'right:-240px; bottom:-260px;'}],
  stampInk:'sakura', stamp:'Design languages',
  headline:'Find a design language you want to borrow.', headInk:'sakura', mark:['borrow','yuzu'],
  lede:'Filter the languages by color and family, then browse until one looks like the thing you were trying to make.',
  foot:'katagami.ai',
  plate: turned({img:'plate-wall.jpg', alt:'The katagami gallery, two shelves of design languages',
    deg:2.2, ink:'sakura', tapeInk:'ramune', tapeCss:'left:38px; top:-9px; transform:rotate(-5deg); z-index:4;'})
}));

// 02 — what a language comes with
fs.writeFileSync('Kit.dc.html', slide({
  no:'NO. 02 · WHAT YOU GET',
  fields:[{ink:'ramune',d:800,pos:'left:-330px; bottom:-320px;'},{ink:'sakura',d:560,pos:'right:-210px; top:-230px;'}],
  stampInk:'ramune', stamp:'DESIGN.md',
  headline:'Each design language comes with a kit.', headInk:'ramune', mark:['kit','yuzu'],
  lede:'A DESIGN.md, design tokens, and reference dashboard and landing pages. Copy it into your project and your agent stays on style.',
  foot:'katagami.ai/language/galley',
  plate: turned({img:'plate-embodiment.jpg', alt:'A reference landing page built in the Galley language',
    deg:-2.4, ink:'ramune', tapeInk:'yuzu', tapeCss:'right:44px; top:-9px; transform:rotate(4deg); z-index:4;'})
}));

// 03 — art styles
fs.writeFileSync('ArtStyles.dc.html', slide({
  no:'THE CATALOG',
  fields:[{ink:'yuzu',d:780,pos:'left:-310px; top:-300px;'},{ink:'ramune',d:600,pos:'right:-230px; bottom:-250px;'}],
  stampInk:'yuzu', stamp:'Art styles',
  headline:'Every design language has an art style.', headInk:'yuzu', mark:['style','sakura'],
  lede:'Browse the art styles on their own too. The catalog lists each style\'s recipe. Pick the look first, then the language.',
  foot:'katagami.ai/art-styles',
  plate: turned({img:'plate-artstyles.jpg', alt:'The katagami art style catalog',
    deg:2.6, ink:'yuzu', tapeInk:'sakura', tapeCss:'left:52px; top:-9px; transform:rotate(-4deg); z-index:4;'})
}));

// 00 — COVER (Product Hunt gallery ratio, 1270x760)
const chip = (img, alt, x, y, deg, ink, tapeInk, tapeLeft) => `      <div style="position: absolute; left: ${x}px; top: ${y}px; width: 302px; transform: rotate(${deg}deg);">
        <div class="chip-pass" style="background: var(--${ink}); transform: translate(11px, 13px);"></div>
        <div class="tape" style="--strip-ink: var(--${tapeInk}); left: ${tapeLeft}px; top: -9px; transform: rotate(${-deg*1.6}deg); z-index: 4;"></div>
        <img class="chip" src="${img}" alt="${alt}" style="position: relative; z-index: 1;">
      </div>`;

fs.writeFileSync('Cover.dc.html', wrap(`<div class="sheet">
${press([{ink:'sakura',d:720,pos:'left:-300px; top:-270px;'},{ink:'ramune',d:640,pos:'right:-250px; bottom:-280px;'}])}
  <div class="grain"></div>
${head('SPECIMEN CATALOG')}
  <div class="cover-body">
    <div class="col" style="gap: 22px;">
      <div class="riso" data-text="Katagami." style="--ink: var(--yuzu); font-size: 118px; font-weight: 800;">Katagami.</div>
      <div class="riso" data-text="Organizing the chaos of design, one language at a time." style="--ink: var(--sakura); font-size: 32px; font-weight: 600; max-width: 560px;">Organizing the <span class="mk" style="--mk: var(--sakura)">chaos<i></i></span> of design, one language at a time.</div>
      <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 4px;">
        <span class="jp">型紙</span>
        <span class="mono">pattern stencil</span>
        <span class="stamp" style="--ink: var(--ramune)">Design languages</span>
        <span class="stamp" style="--ink: var(--sakura); font-size: 16px; padding: 9px 18px;">DESIGN.md</span>
      </div>
    </div>
    <div class="collage">
${chip('card1.jpg','A design language in the katagami gallery', 26, 6, -3.4, 'sakura', 'ramune', 38)}
${chip('card2.jpg','A design language in the katagami gallery', 172, 168, 2.6, 'yuzu', 'sakura', 140)}
${chip('card3.jpg','A design language in the katagami gallery', 14, 330, -1.8, 'ramune', 'yuzu', 56)}
    </div>
  </div>
  <div class="foot">
    <div class="rule" style="flex-grow: 1;"></div>
    <span class="mono">katagami.ai</span>
  </div>
</div>`));

// 00 — COVER (rendered from ui/posters/ph-cover.tsx with poster-ai; edit there, not here)
fs.writeFileSync('Cover.dc.html', wrap(`<div class="sheet" style="padding:0;">
  <img src="cover.jpg" alt="Katagami cover poster" style="display:block; width:100%; height:100%; object-fit:cover;">
</div>`));

// MCP — typographic plate, no screenshot
const cfg = [
  ['{',''],
  ['  "mcpServers": {',''],
  ['    "katagami": {',''],
  ['      "url":','"https://katagami.ai/mcp"'],
  ['    }',''],
  ['  }',''],
  ['}',''],
];
const tools = ['search_design_languages','get_design_md','get_tokens','get_embodiment','search_art_styles','describe_catalog'];
fs.writeFileSync('Mcp.dc.html', wrap(`<div class="sheet">
${press([{ink:'ramune',d:800,pos:'left:-330px; bottom:-320px;'},{ink:'sakura',d:560,pos:'right:-210px; top:-230px;'}])}
  <div class="grain"></div>
${head('THE MCP')}
  <div class="body">
    <div class="col">
      <span class="stamp" style="--ink: var(--ramune); align-self: flex-start;">MCP</span>
      <div class="riso" data-text="Your agent can read the catalog itself." style="--ink: var(--ramune); font-size: 50px;">Your agent can read the <span class="mk" style="--mk: var(--yuzu)">catalog<i></i></span> itself.</div>
      <div class="lede">Point it at katagami.ai/mcp and it can search the languages, open one and pull the tokens, without you copying files around.</div>
    </div>
    <div class="turn">
      <div style="position: relative; width: 100%; transform: rotate(-2.2deg);">
        <div class="pass" style="background: var(--ramune); transform: translate(13px, 15px);"></div>
        <div class="tape" style="--strip-ink: var(--yuzu); left: 50%; top: -9px; margin-left: -41px; transform: rotate(3deg); z-index: 4;"></div>
        <div style="position: relative; z-index: 1; background: #fff; box-shadow: var(--shadow-paper-lg); padding: 30px 34px;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
${cfg.map(([k,v])=>`            <div style="display: flex; gap: 8px; font-family: 'Geist Mono', ui-monospace, monospace; font-size: 15px; line-height: 1.5; white-space: pre;"><span style="color: var(--graphite);">${k}</span><span style="color: var(--sumi);">${v}</span></div>`).join('\n')}
          </div>
          <div style="height: 1px; background: var(--sumi); opacity: 0.15; margin: 20px 0 16px;"></div>
          <div style="display: flex; flex-wrap: wrap; gap: 7px;">
${tools.map(t=>`            <span style="font-family: 'Geist Mono', ui-monospace, monospace; font-size: 12.5px; padding: 4px 8px; background: color-mix(in oklch, var(--ramune) 12%, white); color: var(--sumi);">${t}</span>`).join('\n')}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="foot">
    <div class="rule" style="flex-grow: 1;"></div>
    <span class="mono">katagami.ai/mcp</span>
  </div>
</div>`));

const boards = ['Cover','Main','ArtStyles','Mcp'];
fs.writeFileSync('canvas.json', JSON.stringify({
  artboards: boards.map((b,i)=>({ file:`${b}.dc.html`, x:i*1390, y:0, w:1270, h:760 })),
  launch:{ view:'canvas' }
}, null, 1));
console.log('built', boards.length);
