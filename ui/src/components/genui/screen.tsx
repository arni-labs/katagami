import type { CSSProperties } from "react";
import {
  CARDS,
  FORM_FIELDS,
  FORM_SUBMIT,
  NAV,
  SETTINGS_ROWS,
  STATS,
  STEPS,
  TABLE_COLUMNS,
  type Component,
  type ScreenPlan,
} from "@/lib/genui/catalogue";
import { themeVars, type ScreenTheme } from "@/lib/genui/theme";

// Renders a plan in a theme. No hooks and no state, so the same component
// serves the client pages (prototypes 1, 2, 4) and the server page (3). Every
// colour, radius, font and shadow is a --g-* variable from the theme; the
// only text not in the catalogue is the brief, used as the product's name.

const DENSITY_SCALE = { spacious: 1.6, comfortable: 1, compact: 0.65 } as const;

// One stylesheet for every screen on a page; scoped by .g-screen.
const STYLE = `
.g-screen{background:var(--g-bg);color:var(--g-text);font-family:var(--g-font-body);font-size:var(--g-size);line-height:var(--g-leading);width:100%;min-height:100%;container-type:inline-size}
.g-screen *{box-sizing:border-box;margin:0}
.g-screen h1,.g-screen h2,.g-screen h3{font-family:var(--g-font-heading);font-weight:var(--g-heading-weight);text-transform:var(--g-heading-transform);letter-spacing:var(--g-tracking);line-height:1.08}
.g-pad{padding:calc(var(--g-space)*3*var(--g-d)) calc(var(--g-space)*3)}
.g-bar{display:flex;align-items:center;justify-content:space-between;gap:calc(var(--g-space)*2);padding:calc(var(--g-space)*1.5) calc(var(--g-space)*3);border-bottom:1px solid var(--g-border)}
.g-brand{font-family:var(--g-font-heading);font-weight:var(--g-heading-weight);text-transform:var(--g-heading-transform);letter-spacing:var(--g-tracking);font-size:1.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.g-nav{display:flex;gap:calc(var(--g-space)*2);font-size:.85em;color:var(--g-muted)}
.g-nav span:first-child{color:var(--g-text)}
.g-btn{display:inline-flex;align-items:center;justify-content:center;background:var(--g-accent);color:var(--g-on-accent);border:0;border-radius:var(--g-r-md);padding:calc(var(--g-space)*1.25) calc(var(--g-space)*2.5);font:inherit;font-weight:600;font-size:.95em;box-shadow:var(--g-shadow-sm);transition:transform var(--g-duration) var(--g-easing);cursor:default}
.g-btn:hover{transform:translateY(-1px)}
.g-btn.g-ghost{background:transparent;color:var(--g-text);box-shadow:none;border:1px solid var(--g-border)}
.g-eyebrow{font-family:var(--g-font-mono);font-size:.7em;letter-spacing:.12em;text-transform:uppercase;color:var(--g-accent)}
.g-hero{display:flex;flex-direction:column;gap:calc(var(--g-space)*2);max-width:38em}
.g-hero h1{font-size:clamp(1.8em,5cqw,3em)}
.g-hero.g-bold{background:var(--g-accent);color:var(--g-on-accent);max-width:none;border-radius:var(--g-r-lg)}
.g-hero.g-bold h1{font-size:clamp(2.2em,7cqw,4em)}
.g-hero.g-bold .g-eyebrow{color:inherit;opacity:.8}
.g-hero.g-bold .g-btn{background:var(--g-on-accent);color:var(--g-accent)}
.g-hero.g-quiet h1{font-size:clamp(1.4em,3.5cqw,2em)}
.g-hero.g-quiet .g-eyebrow{color:var(--g-muted)}
.g-sub{color:var(--g-muted);max-width:32em}
.g-hero.g-bold .g-sub{color:inherit;opacity:.85}
.g-card{background:var(--g-surface);border-radius:var(--g-r-lg);box-shadow:var(--g-shadow-sm);padding:calc(var(--g-space)*2.5*var(--g-d)) calc(var(--g-space)*2.5)}
.g-grid{display:grid;gap:calc(var(--g-space)*2*var(--g-d))}
.g-stats{grid-template-columns:repeat(auto-fit,minmax(9em,1fr))}
.g-stat .g-num{font-family:var(--g-font-heading);font-weight:var(--g-heading-weight);letter-spacing:var(--g-tracking);font-size:2em;line-height:1;margin-top:calc(var(--g-space)*1)}
.g-stat .g-label{font-size:.8em;color:var(--g-muted)}
.g-cards{grid-template-columns:repeat(auto-fit,minmax(13em,1fr))}
.g-pic{aspect-ratio:16/10;border-radius:var(--g-r-md);background:var(--g-accent2);opacity:.9;margin-bottom:calc(var(--g-space)*1.5)}
.g-cardt{font-size:1.05em}
.g-cardd{font-size:.9em;color:var(--g-muted);margin-top:calc(var(--g-space)*.5)}
.g-form{display:grid;gap:calc(var(--g-space)*2*var(--g-d));max-width:36em}
.g-field{display:grid;gap:calc(var(--g-space)*.75)}
.g-field label{font-size:.85em;font-weight:600}
.g-input{background:var(--g-surface);color:var(--g-text);border:1px solid var(--g-border);border-radius:var(--g-r-sm);padding:calc(var(--g-space)*1.25) calc(var(--g-space)*1.5);font:inherit;font-size:.95em;min-height:2.6em;display:flex;align-items:center;color:var(--g-muted)}
.g-input.g-area{min-height:5.5em;align-items:flex-start}
.g-input.g-select{justify-content:space-between}
.g-table{width:100%;border-collapse:collapse;font-size:.92em}
.g-table th{text-align:left;font-family:var(--g-font-mono);font-size:.75em;letter-spacing:.08em;text-transform:uppercase;color:var(--g-muted);font-weight:500;padding:calc(var(--g-space)*1*var(--g-d)) calc(var(--g-space)*1.5);border-bottom:1px solid var(--g-border)}
.g-table td{padding:calc(var(--g-space)*1.25*var(--g-d)) calc(var(--g-space)*1.5);border-bottom:1px solid var(--g-border)}
.g-table tr:last-child td{border-bottom:0}
.g-pill{display:inline-block;font-size:.8em;padding:.15em .7em;border-radius:var(--g-r-full);background:var(--g-surface2);color:var(--g-text)}
.g-pill.ok{background:var(--g-success);color:var(--g-on-accent)}
.g-pill.warn{background:var(--g-warning);color:var(--g-on-accent)}
.g-pill.bad{background:var(--g-error);color:var(--g-on-accent)}
.g-rows{display:grid}
.g-row{display:flex;align-items:center;justify-content:space-between;gap:calc(var(--g-space)*2);padding:calc(var(--g-space)*1.75*var(--g-d)) 0;border-bottom:1px solid var(--g-border)}
.g-row:last-child{border-bottom:0}
.g-row .g-val{color:var(--g-muted);font-size:.9em}
.g-switch{width:2.6em;height:1.5em;border-radius:var(--g-r-full);background:var(--g-border);position:relative;flex:none}
.g-switch.on{background:var(--g-accent)}
.g-switch::after{content:"";position:absolute;top:.2em;left:.2em;width:1.1em;height:1.1em;border-radius:var(--g-r-full);background:var(--g-surface)}
.g-switch.on::after{left:auto;right:.2em;background:var(--g-on-accent)}
.g-steps{display:flex;gap:calc(var(--g-space)*1.5);align-items:center;flex-wrap:wrap;font-size:.85em}
.g-step{display:flex;align-items:center;gap:calc(var(--g-space)*1)}
.g-dot{width:1.6em;height:1.6em;border-radius:var(--g-r-full);display:inline-flex;align-items:center;justify-content:center;background:var(--g-surface2);color:var(--g-muted);font-family:var(--g-font-mono);font-size:.8em}
.g-step.done .g-dot,.g-step.now .g-dot{background:var(--g-accent);color:var(--g-on-accent)}
.g-step.todo{color:var(--g-muted)}
.g-line{width:2em;height:1px;background:var(--g-border)}
.g-notice{display:flex;justify-content:space-between;gap:calc(var(--g-space)*2);align-items:center;background:var(--g-surface2);border-left:4px solid var(--g-accent);border-radius:var(--g-r-sm);padding:calc(var(--g-space)*1.5) calc(var(--g-space)*2);font-size:.92em}
.g-cta{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:calc(var(--g-space)*2);background:var(--g-surface);border-radius:var(--g-r-lg);box-shadow:var(--g-shadow-md);padding:calc(var(--g-space)*3*var(--g-d)) calc(var(--g-space)*3)}
.g-cta h2{font-size:1.4em;max-width:22em}
.g-foot{padding:calc(var(--g-space)*2) calc(var(--g-space)*3);border-top:1px solid var(--g-border);font-family:var(--g-font-mono);font-size:.7em;letter-spacing:.08em;text-transform:uppercase;color:var(--g-muted);display:flex;justify-content:space-between;gap:1em}
.g-h2{font-size:1.25em;margin-bottom:calc(var(--g-space)*2*var(--g-d))}
@media (prefers-reduced-motion:reduce){.g-screen *{transition:none!important}}
`;

/** The brief as a product name: the person's words, first letter up, articles dropped. */
export function productName(brief: string): string {
  const cut = brief.trim().replace(/^(an?|the)\s+/i, "").replace(/[.!?]+$/, "");
  const name = cut.charAt(0).toUpperCase() + cut.slice(1);
  return name.length > 44 ? `${name.slice(0, 41).trimEnd()}…` : name;
}

function Status({ text }: { text: string }) {
  const t = text.toLowerCase();
  const tone = /confirm|paid|active|shipped|\+/.test(t) ? "ok" : /wait|packing|invited|progress|medium/.test(t) ? "warn" : /cancel|refund|open|high/.test(t) ? "bad" : "";
  return <span className={`g-pill ${tone}`}>{text}</span>;
}

function Part({ which, plan, name }: { which: Component; plan: ScreenPlan; name: string }) {
  switch (which) {
    case "hero":
      return (
        <section className={`g-pad g-hero g-${plan.emphasis}`}>
          <p className="g-eyebrow">{name}</p>
          <h1>{name}</h1>
          <p className="g-sub">The short pitch goes here: what it does, for whom, and why it is better than the way things are done now.</p>
          <div style={{ display: "flex", gap: "calc(var(--g-space) * 1.5)", flexWrap: "wrap" }}>
            <span className="g-btn">Get started</span>
            <span className="g-btn g-ghost">See how it works</span>
          </div>
        </section>
      );
    case "notice":
      return (
        <section className="g-pad" style={{ paddingBottom: 0 }}>
          <div className="g-notice">
            <span>Something the person should know before going on.</span>
            <span className="g-eyebrow" style={{ color: "var(--g-muted)" }}>Dismiss</span>
          </div>
        </section>
      );
    case "steps":
      return (
        <section className="g-pad" style={{ paddingBottom: 0 }}>
          <ol className="g-steps" style={{ listStyle: "none", padding: 0 }}>
            {STEPS.map((s, i) => (
              <li key={s} className={`g-step ${i === 0 ? "done" : i === 1 ? "now" : "todo"}`}>
                <span className="g-dot">{i + 1}</span>
                <span>{s}</span>
                {i < STEPS.length - 1 ? <span className="g-line" /> : null}
              </li>
            ))}
          </ol>
        </section>
      );
    case "stats":
      return (
        <section className="g-pad">
          <div className="g-grid g-stats">
            {STATS.map((s) => (
              <div key={s.label} className="g-card g-stat">
                <div className="g-label">{s.label}</div>
                <div className="g-num">{s.value}</div>
              </div>
            ))}
          </div>
        </section>
      );
    case "table": {
      const t = TABLE_COLUMNS[plan.table];
      return (
        <section className="g-pad">
          <h2 className="g-h2">{plan.table.charAt(0).toUpperCase() + plan.table.slice(1)}</h2>
          <div className="g-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="g-table">
              <thead>
                <tr>{t.head.map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {t.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => (
                      <td key={i}>{i === row.length - 1 ? <Status text={cell} /> : cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }
    case "cards":
      return (
        <section className="g-pad">
          <div className="g-grid g-cards">
            {CARDS.map((c) => (
              <div key={c.title} className="g-card">
                <div className="g-pic" />
                <h3 className="g-cardt">{c.title}</h3>
                <p className="g-cardd">{c.detail}</p>
              </div>
            ))}
          </div>
        </section>
      );
    case "form": {
      const fields = FORM_FIELDS[plan.form];
      return (
        <section className="g-pad">
          <h2 className="g-h2">{FORM_SUBMIT[plan.form] === "Search" ? "Find a crossing" : plan.form === "signup" ? "Create your account" : plan.form === "checkout" ? "Payment" : plan.form === "contact" ? "Get in touch" : "Book a visit"}</h2>
          <div className="g-form">
            {fields.map((f) => (
              <div key={f.label} className="g-field">
                <label>{f.label}</label>
                {f.kind === "textarea" ? (
                  <div className="g-input g-area">Optional</div>
                ) : f.kind === "select" ? (
                  <div className="g-input g-select"><span>Choose…</span><span>▾</span></div>
                ) : f.kind === "date" ? (
                  <div className="g-input g-select"><span>Pick a date</span><span>▾</span></div>
                ) : (
                  <div className="g-input" />
                )}
              </div>
            ))}
            <div>
              <span className="g-btn">{FORM_SUBMIT[plan.form]}</span>
            </div>
          </div>
        </section>
      );
    }
    case "settings":
      return (
        <section className="g-pad">
          <h2 className="g-h2">Preferences</h2>
          <div className="g-card g-rows">
            {SETTINGS_ROWS.map((r) => (
              <div key={r.label} className="g-row">
                <span>{r.label}</span>
                {r.toggle === null ? <span className="g-val">{r.value}</span> : <span className={`g-switch ${r.toggle ? "on" : ""}`} />}
              </div>
            ))}
          </div>
        </section>
      );
    case "cta":
      return (
        <section className="g-pad">
          <div className="g-cta">
            <h2>Ready when you are.</h2>
            <span className="g-btn">Get started</span>
          </div>
        </section>
      );
  }
}

export function Screen({ plan, theme, brief, style }: { plan: ScreenPlan; theme: ScreenTheme; brief: string; style?: CSSProperties }) {
  const name = productName(brief);
  const vars = { ...themeVars(theme), "--g-d": String(DENSITY_SCALE[plan.density]) } as CSSProperties;
  return (
    <div className="g-screen" style={{ ...vars, ...style }} data-archetype={plan.archetype} data-language={theme.id}>
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <header className="g-bar">
        <span className="g-brand">{name}</span>
        <nav className="g-nav">
          {NAV[plan.archetype].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </nav>
      </header>
      {plan.components.map((c) => (
        <Part key={c} which={c} plan={plan} name={name} />
      ))}
      <footer className="g-foot">
        <span>{theme.name}</span>
        <span>{plan.archetype} · {plan.density} · {plan.emphasis}</span>
      </footer>
    </div>
  );
}

/** The language's fonts, loaded from the URL its tokens carry. */
export function ThemeFonts({ themes }: { themes: ScreenTheme[] }) {
  const urls = [...new Set(themes.map((t) => t.type.fontsUrl).filter((u) => u.startsWith("https://fonts.googleapis.com/")))];
  return (
    <>
      {urls.map((u) => (
         
        <link key={u} rel="stylesheet" href={u} />
      ))}
    </>
  );
}
