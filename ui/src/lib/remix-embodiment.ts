// Builds a self-contained, high-quality embodiment HTML for the Remix Studio
// preview — a real, scene-first app screen for the chosen composition, themed
// live by the UI language's typography/shape tokens, recolored by the palette,
// and filled with the art style's imagery in its actual slots. Rendered in an
// iframe via srcdoc (same approach as design-language embodiments).

interface Tokens {
  typography?: Record<string, string | number | undefined>;
  radii?: Record<string, string>;
  spacing?: { base?: string; scale?: number[] } & Record<string, unknown>;
  shadows?: Record<string, string>;
}

export interface EmbodimentInput {
  compositionKey: string;
  uiName: string;
  artName: string;
  tokens: Tokens;
  roles: Record<string, string>;
  slots: Record<string, string>; // slot key -> image url
}

function v(roles: Record<string, string>, k: string, fb: string) {
  return roles[k] || fb;
}

function cssVars(tokens: Tokens, roles: Record<string, string>): string {
  const t = tokens.typography ?? {};
  const fh = (t.heading_font as string) || "system-ui, -apple-system, sans-serif";
  const fb = (t.body_font as string) || "system-ui, -apple-system, sans-serif";
  const radii = tokens.radii ?? {};
  const radius = radii.lg || radii.md || "12px";
  const radiusSm = radii.sm || radii.md || "6px";
  const accent = v(roles, "accent", "#3a6df0");
  return `
    --bg:${v(roles, "bg", "#ffffff")};
    --surface:${v(roles, "surface", "#f6f6f4")};
    --surface2:color-mix(in srgb, ${v(roles, "surface", "#f0f0ee")} 60%, ${v(roles, "bg", "#fff")});
    --text:${v(roles, "text", "#16181d")};
    --muted:${v(roles, "muted", "#6b7280")};
    --border:${v(roles, "border", "#e5e7eb")};
    --accent:${accent};
    --on-accent:${readable(accent)};
    --success:${v(roles, "success", "#16a34a")};
    --warning:${v(roles, "warning", "#d97706")};
    --error:${v(roles, "error", "#dc2626")};
    --info:${v(roles, "info", "#2563eb")};
    --radius:${radius};
    --radius-sm:${radiusSm};
    --fh:${fh};
    --fb:${fb};`;
}

function readable(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.62 ? "#16181d" : "#ffffff";
}

function fontLink(tokens: Tokens): string {
  const url = tokens.typography?.google_fonts_url as string | undefined;
  if (!url || !/^https:\/\/fonts\.googleapis\.com/.test(url)) return "";
  return `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${url}" rel="stylesheet">`;
}

const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--bg);color:var(--text);font-family:var(--fb);line-height:1.6;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%}
a{color:inherit;text-decoration:none}
.wrap{max-width:1080px;margin:0 auto;padding:0 40px}
.h{font-family:var(--fh);line-height:1.04;letter-spacing:-0.02em;color:var(--text)}
.mut{color:var(--muted)}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--accent);color:var(--on-accent);padding:13px 22px;border-radius:var(--radius);font-weight:700;font-size:15px;border:0}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
.chip{display:inline-block;font-family:var(--fh);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--bg));padding:5px 11px;border-radius:999px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
nav.top{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
nav.top .links{display:flex;gap:26px;font-size:14px}
.logo{display:flex;align-items:center;gap:10px;font-family:var(--fh);font-weight:800;font-size:18px}
.logo .mark{width:26px;height:26px;border-radius:7px;background:var(--accent)}
.imgslot{background:color-mix(in srgb,var(--accent) 12%,var(--surface));overflow:hidden}
.imgslot img{width:100%;height:100%;object-fit:cover}
`;

function img(slots: Record<string, string>, key: string, cls: string, style = ""): string {
  const src = slots[key] || "";
  return `<div class="imgslot ${cls}" style="${style}">${src ? `<img src="${src}" alt="">` : ""}</div>`;
}

function landing(i: EmbodimentInput): string {
  const s = i.slots;
  return `
  <nav class="top wrap">
    <div class="logo"><span class="mark"></span>${i.uiName.split(" ")[0]}</div>
    <div class="links mut"><span>Product</span><span>Pricing</span><span>Docs</span><span>About</span></div>
    <a class="btn" style="padding:9px 16px;font-size:13px">Get started</a>
  </nav>
  <section class="wrap" style="display:grid;grid-template-columns:1.05fr .95fr;gap:52px;align-items:center;padding:56px 40px 64px">
    <div>
      <span class="chip">${i.artName}</span>
      <h1 class="h" style="font-size:clamp(38px,5vw,60px);margin:18px 0 0">Design systems that<br>compose like music.</h1>
      <p class="mut" style="font-size:18px;margin:20px 0 28px;max-width:30em">Mix a UI language, a palette, and an art style — every surface stays coherent, every screen ships on brand.</p>
      <div style="display:flex;gap:12px"><a class="btn">Start building</a><a class="btn ghost">See the gallery</a></div>
      <div style="display:flex;gap:28px;margin-top:36px">
        <div><div class="h" style="font-size:26px">12k+</div><div class="mut" style="font-size:13px">teams</div></div>
        <div><div class="h" style="font-size:26px">98%</div><div class="mut" style="font-size:13px">on-brand</div></div>
        <div><div class="h" style="font-size:26px">3 lanes</div><div class="mut" style="font-size:13px">remixable</div></div>
      </div>
    </div>
    ${img(s, "hero", "", "aspect-ratio:4/3;border-radius:var(--radius);border:1px solid var(--border)")}
  </section>
  <section class="wrap" style="padding:24px 40px 64px">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px">
      ${["feature-1", "feature-2", "feature-3"].map((k, n) => `
      <div class="card">
        ${img(s, k, "", "aspect-ratio:16/10")}
        <div style="padding:20px">
          <h3 class="h" style="font-size:19px">${["Compose", "Recolor", "Hand off"][n]}</h3>
          <p class="mut" style="font-size:14px;margin-top:8px">${["Pick from curated lanes and combine them with confidence.", "Palettes recolor every token live — no manual theming.", "Export a portable brief any agent can build from."][n]}</p>
        </div>
      </div>`).join("")}
    </div>
  </section>
  <section style="background:var(--surface)"><div class="wrap" style="padding:48px 40px;display:flex;gap:20px;align-items:center;flex-wrap:wrap">
    <div style="display:flex;gap:-10px">${["testimonial-avatar-1", "testimonial-avatar-2"].map((k) => `<div style="width:54px;height:54px;border-radius:999px;overflow:hidden;border:2px solid var(--bg);margin-right:-12px" class="imgslot">${s[k] ? `<img src="${s[k]}" alt="">` : ""}</div>`).join("")}</div>
    <p class="h" style="font-size:22px;flex:1;min-width:260px;letter-spacing:-0.01em">"We shipped a fully on-brand product in a weekend — the remix did the taste."</p>
  </div></section>
  <section style="background:var(--accent);color:var(--on-accent)"><div class="wrap" style="padding:56px 40px;text-align:center">
    <h2 class="h" style="font-size:34px;color:var(--on-accent)">Ready to remix your stack?</h2>
    <a class="btn" style="background:var(--bg);color:var(--text);margin-top:20px">Open the studio</a>
  </div></section>
  <footer style="position:relative">${img(s, "footer-bg", "", "position:absolute;inset:0;opacity:.18")}
    <div class="wrap" style="position:relative;padding:40px;display:flex;justify-content:space-between;align-items:center">
      <div class="logo"><span class="mark"></span>${i.uiName.split(" ")[0]}</div>
      <div class="mut" style="font-size:13px">Themed live · ${i.uiName}</div>
    </div>
  </footer>`;
}

function dashboard(i: EmbodimentInput): string {
  const s = i.slots;
  const stat = (label: string, val: string, tone: string) =>
    `<div class="card" style="padding:18px"><div class="mut" style="font-size:12px;text-transform:uppercase;letter-spacing:.1em">${label}</div><div class="h" style="font-size:30px;margin-top:6px">${val}</div><div style="height:4px;border-radius:2px;margin-top:12px;background:${tone}"></div></div>`;
  return `
  <div style="display:grid;grid-template-columns:230px 1fr;min-height:100%">
    <aside style="background:var(--surface);border-right:1px solid var(--border);padding:22px 16px">
      <div class="logo" style="padding:0 6px 18px"><span class="mark"></span>${i.uiName.split(" ")[0]}</div>
      ${["Overview", "Projects", "Analytics", "Team", "Settings"].map((l, n) => `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-sm);font-size:14px;${n === 0 ? "background:color-mix(in srgb,var(--accent) 14%,var(--surface));color:var(--accent);font-weight:700" : "color:var(--muted)"}"><span style="width:8px;height:8px;border-radius:2px;background:${n === 0 ? "var(--accent)" : "var(--border)"}"></span>${l}</div>`).join("")}
    </aside>
    <main style="padding:26px 30px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">
        <div><h1 class="h" style="font-size:26px">Overview</h1><div class="mut" style="font-size:13px">Welcome back</div></div>
        <div style="display:flex;gap:12px;align-items:center"><a class="btn" style="padding:9px 16px;font-size:13px">New project</a><div style="width:38px;height:38px;border-radius:999px;overflow:hidden" class="imgslot">${s["avatar"] ? `<img src="${s["avatar"]}" alt="">` : ""}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:18px">
        ${stat("Revenue", "$48.2k", "var(--success)")}${stat("Active", "1,284", "var(--accent)")}${stat("Churn", "2.1%", "var(--warning)")}
      </div>
      <div class="card" style="padding:20px">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px"><h3 class="h" style="font-size:17px">Activity</h3><span class="chip">${i.artName}</span></div>
        <div style="display:flex;align-items:flex-end;gap:10px;height:150px">
          ${[60, 38, 82, 50, 94, 70, 44, 88].map((h) => `<div style="flex:1;height:${h}%;border-radius:var(--radius-sm) var(--radius-sm) 0 0;background:color-mix(in srgb,var(--accent) ${30 + h / 2}%,var(--surface))"></div>`).join("")}
        </div>
      </div>
      ${s["empty-state"] ? `<div class="card" style="margin-top:18px;padding:20px;display:flex;gap:18px;align-items:center"><div class="imgslot" style="width:120px;height:90px;border-radius:var(--radius-sm);flex:none"><img src="${s["empty-state"]}" alt=""></div><div><h3 class="h" style="font-size:17px">No reports yet</h3><p class="mut" style="font-size:14px;margin-top:4px">Create your first report to see insights here.</p></div></div>` : ""}
    </main>
  </div>`;
}

function centered(i: EmbodimentInput, opts: { brandKey: string; title: string; sub: string; cta: string; form: boolean }): string {
  const s = i.slots;
  return `
  <div style="position:relative;min-height:100%;display:grid;place-items:center;padding:48px">
    ${s[opts.brandKey] || s["background"] ? `<div class="imgslot" style="position:absolute;inset:0;opacity:.16"><img src="${s["background"] || s[opts.brandKey]}" alt=""></div>` : ""}
    <div class="card" style="position:relative;width:100%;max-width:440px;padding:34px;text-align:center">
      ${s[opts.brandKey] ? `<div class="imgslot" style="width:84px;height:84px;border-radius:var(--radius);margin:0 auto 18px"><img src="${s[opts.brandKey]}" alt=""></div>` : `<div class="logo" style="justify-content:center;margin-bottom:18px"><span class="mark"></span>${i.uiName.split(" ")[0]}</div>`}
      <h1 class="h" style="font-size:28px">${opts.title}</h1>
      <p class="mut" style="font-size:15px;margin:8px 0 22px">${opts.sub}</p>
      ${opts.form ? `<div style="display:flex;flex-direction:column;gap:12px;text-align:left">
        <div><div class="mut" style="font-size:12px;margin-bottom:5px">Email</div><div style="height:44px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg)"></div></div>
        <div><div class="mut" style="font-size:12px;margin-bottom:5px">Password</div><div style="height:44px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg)"></div></div>
      </div>` : ""}
      <a class="btn" style="width:100%;justify-content:center;margin-top:18px">${opts.cta}</a>
    </div>
  </div>`;
}

export function buildRemixEmbodiment(input: EmbodimentInput): string {
  let body: string;
  switch (input.compositionKey) {
    case "compositions.dashboard": body = dashboard(input); break;
    case "compositions.auth-page": body = centered(input, { brandKey: "brand-illustration", title: "Welcome back", sub: "Sign in to your workspace", cta: "Sign in", form: true }); break;
    case "compositions.error-page": body = centered(input, { brandKey: "illustration", title: "Lost the thread", sub: "We couldn't find that page (404).", cta: "Back home", form: false }); break;
    case "compositions.settings-page": body = dashboard(input); break;
    default: body = landing(input);
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${fontLink(input.tokens)}<style>:root{${cssVars(input.tokens, input.roles)}}${BASE_CSS}</style></head><body>${body}</body></html>`;
}
