import React from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Tabs from "@radix-ui/react-tabs";
import * as Progress from "@radix-ui/react-progress";
import * as Avatar from "@radix-ui/react-avatar";
import * as Separator from "@radix-ui/react-separator";

const orbitBadges = [
  { label: "MOOD SAFE", tone: "mint", top: "9%", left: "10%" },
  { label: "SYNCED 24/7", tone: "violet", top: "14%", right: "9%" },
  { label: "HEARTBEAT +12%", tone: "peach", bottom: "39%", left: "6%" },
  { label: "CUTIE OS", tone: "pink", bottom: "8%", right: "16%" },
];

const crew = [
  { name: "Mika", role: "Charm ops", hue: "pink", initials: "MI" },
  { name: "Pomu", role: "Signal sprite", hue: "mint", initials: "PO" },
  { name: "Rin", role: "Patch pilot", hue: "violet", initials: "RI" },
];

const feed = [
  {
    title: "Charm patch queued",
    body: "Mascot-led onboarding now wraps new devices in plush gradients and empathy prompts.",
    tag: "LIVE DROP",
    tone: "pink",
  },
  {
    title: "Orbit relay stable",
    body: "Companion widgets synced 84 creator carts without losing sparkle markers or wish-list states.",
    tag: "SYSTEM JOY",
    tone: "violet",
  },
  {
    title: "Soft fail rescued",
    body: "Automation rerouted a sleepy checkout bot and sent a heart-stamped apology bundle in 18 seconds.",
    tag: "SAVE",
    tone: "mint",
  },
];

const inventory = [
  { name: "Dream Pods", value: "148", delta: "+18 today", tone: "pink" },
  { name: "Orbital charms", value: "62", delta: "+7 limited", tone: "violet" },
  { name: "Cozy repairs", value: "19", delta: "3 urgent", tone: "mint" },
];

export default function NeoKawaiiTechEmbodiment() {
  return (
    <div className="nk-shell">
      <style>{css}</style>

      <div className="nk-atmosphere nk-grid"></div>
      <div className="nk-atmosphere nk-dots"></div>
      <div className="nk-orbit nk-orbit-a"></div>
      <div className="nk-orbit nk-orbit-b"></div>
      <div className="nk-heart nk-heart-a"></div>
      <div className="nk-heart nk-heart-b"></div>
      <div className="nk-sparkle nk-sparkle-a">✦</div>
      <div className="nk-sparkle nk-sparkle-b">✦</div>

      {orbitBadges.map((badge) => (
        <div key={badge.label} className={"nk-floating-badge " + badge.tone} style={badge as React.CSSProperties}>
          {badge.label}
        </div>
      ))}

      <header className="nk-topbar nk-card">
        <div className="nk-brand-cluster">
          <div className="nk-mascot-chip">
            <span className="nk-mascot-face">◕ ◡ ◕</span>
          </div>
          <div>
            <div className="nk-section-tag pink">COMPANION CLOUD</div>
            <h1>Neo-Kawaii Tech habitat for creator devices, plush automation, and candy-bright system care.</h1>
          </div>
        </div>

        <div className="nk-top-actions">
          <button className="nk-gummy-button pink">Launch cuddle sync</button>
          <button className="nk-gummy-button violet ghost">Share drop room</button>
        </div>
      </header>

      <main className="nk-layout">
        <section className="nk-hero-stack">
          <article className="nk-hero-panel nk-card">
            <div className="nk-panel-heading">
              <div>
                <div className="nk-section-tag violet">HERO CONTROL</div>
                <h2>Orbital merch station</h2>
              </div>
              <div className="nk-chip-row">
                <span className="nk-stat-chip pink">79 plush nodes</span>
                <span className="nk-stat-chip mint">12 surprise gifts</span>
              </div>
            </div>

            <div className="nk-hero-content">
              <div className="nk-device-stage">
                <div className="nk-device-card">
                  <div className="nk-device-glow"></div>
                  <div className="nk-device-screen">
                    <div className="nk-screen-top">
                      <span className="nk-section-tag mint">MOOD ENGINE</span>
                      <span className="nk-micro-pill">98% adored</span>
                    </div>
                    <div className="nk-wave-band wave-one"></div>
                    <div className="nk-wave-band wave-two"></div>
                    <div className="nk-wave-band wave-three"></div>
                    <div className="nk-sticker-row">
                      <span className="nk-sticker">★ charm beam</span>
                      <span className="nk-sticker">❤ cozy ping</span>
                    </div>
                  </div>
                </div>
                <div className="nk-mini-card pink">
                  <span className="nk-section-tag">PATCH ARC</span>
                  <strong>Soft-launch skins now following each fan cluster.</strong>
                </div>
                <div className="nk-mini-card mint shift-up">
                  <span className="nk-section-tag">JOY ROUTE</span>
                  <strong>Checkout companions boosted gift-bundle completion by 16%.</strong>
                </div>
              </div>

              <div className="nk-hero-sidebar">
                <div className="nk-aside-card candy-pink">
                  <div className="nk-kpi-number">24m</div>
                  <p>average cuddle-to-cart time after mascot prompts appear.</p>
                </div>
                <div className="nk-aside-card candy-violet">
                  <div className="nk-kpi-number">8.7</div>
                  <p>community mood score across pop-up storefronts and device skins.</p>
                </div>
              </div>
            </div>
          </article>

          <article className="nk-activity-panel nk-card">
            <div className="nk-panel-heading">
              <div>
                <div className="nk-section-tag mint">LIVE SIGNALS</div>
                <h3>Companion feed</h3>
              </div>
              <span className="nk-micro-pill violet">orbit room open</span>
            </div>

            <div className="nk-feed-list">
              {feed.map((item) => (
                <div className={"nk-feed-item " + item.tone} key={item.title}>
                  <div className="nk-feed-badge">{item.tag}</div>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <aside className="nk-utility-rail">
          <article className="nk-card nk-rail-card">
            <div className="nk-panel-heading compact">
              <div>
                <div className="nk-section-tag pink">CREW RING</div>
                <h3>Operators on glow duty</h3>
              </div>
            </div>
            <div className="nk-avatar-stack">
              {crew.map((member) => (
                <div className="nk-avatar-row" key={member.name}>
                  <Avatar.Root className={"nk-avatar " + member.hue}>
                    <Avatar.Fallback>{member.initials}</Avatar.Fallback>
                  </Avatar.Root>
                  <div>
                    <strong>{member.name}</strong>
                    <p>{member.role}</p>
                  </div>
                  <span className="nk-mini-status">online</span>
                </div>
              ))}
            </div>
          </article>

          <article className="nk-card nk-rail-card">
            <div className="nk-panel-heading compact">
              <div>
                <div className="nk-section-tag violet">SOFT TOGGLES</div>
                <h3>Ambient automations</h3>
              </div>
            </div>

            <div className="nk-switch-list">
              <label className="nk-switch-row">
                <div>
                  <strong>Charm-safe mode</strong>
                  <p>adds gentler copy and gift recovery when carts wobble</p>
                </div>
                <Switch.Root className="nk-switch-root" defaultChecked>
                  <Switch.Thumb className="nk-switch-thumb" />
                </Switch.Root>
              </label>
              <label className="nk-switch-row">
                <div>
                  <strong>Orbit surprise drops</strong>
                  <p>sends collectible badges when loyal devices wake back up</p>
                </div>
                <Switch.Root className="nk-switch-root bubble" defaultChecked>
                  <Switch.Thumb className="nk-switch-thumb" />
                </Switch.Root>
              </label>
            </div>
          </article>

          <article className="nk-card nk-rail-card">
            <div className="nk-panel-heading compact">
              <div>
                <div className="nk-section-tag mint">PATCH PROGRESS</div>
                <h3>Glow release train</h3>
              </div>
              <span className="nk-micro-pill pink">Phase 3</span>
            </div>
            <div className="nk-progress-wrap">
              <Progress.Root className="nk-progress-root" value={76}>
                <Progress.Indicator className="nk-progress-indicator" style={{ transform: "translateX(-24%)" }} />
              </Progress.Root>
              <div className="nk-progress-meta">
                <strong>76% plush rollout complete</strong>
                <p>mascot overlays and candy outlines now active in 18 storefront capsules</p>
              </div>
            </div>
          </article>
        </aside>
      </main>

      <section className="nk-bottom-grid">
        <article className="nk-card nk-commerce-panel">
          <div className="nk-panel-heading">
            <div>
              <div className="nk-section-tag pink">COLLECTIBLE FLOW</div>
              <h3>Storefront constellation</h3>
            </div>
          </div>
          <Tabs.Root className="nk-tabs-root" defaultValue="drops">
            <Tabs.List className="nk-tabs-list" aria-label="Commerce views">
              <Tabs.Trigger className="nk-tab-trigger" value="drops">Drops</Tabs.Trigger>
              <Tabs.Trigger className="nk-tab-trigger" value="bundles">Bundles</Tabs.Trigger>
              <Tabs.Trigger className="nk-tab-trigger" value="repairs">Repairs</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content className="nk-tab-panel" value="drops">
              <div className="nk-inventory-grid">
                {inventory.map((item) => (
                  <div className={"nk-inventory-card " + item.tone} key={item.name}>
                    <span className="nk-section-tag">{item.name}</span>
                    <strong>{item.value}</strong>
                    <p>{item.delta}</p>
                  </div>
                ))}
              </div>
            </Tabs.Content>
            <Tabs.Content className="nk-tab-panel" value="bundles">
              <div className="nk-bundle-card">
                <strong>Dream bundle engine pairs decals, plush docks, and streaming accessories based on fan aura tags.</strong>
                <p>Sticker-framed recommendations make technical bundles feel giftable, social, and emotionally legible.</p>
              </div>
            </Tabs.Content>
            <Tabs.Content className="nk-tab-panel" value="repairs">
              <div className="nk-bundle-card mint">
                <strong>Repair concierge wraps device incidents in friendly tone, mascot diagnostics, and visible recovery hearts.</strong>
                <p>Even failures feel collectible and reassuring instead of corporate or clinical.</p>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </article>

        <article className="nk-card nk-note-panel">
          <div className="nk-panel-heading">
            <div>
              <div className="nk-section-tag violet">DESIGN DNA</div>
              <h3>Why this feels Neo-Kawaii Tech</h3>
            </div>
          </div>
          <ul className="nk-dna-list">
            <li>Milky glass cards sit on candy gradients with luminous white sticker outlines.</li>
            <li>Capsule labels, plush toggles, and gummy buttons make controls feel collectible.</li>
            <li>Hearts, sparkles, dot grids, and orbital lines stay visible across the entire scene.</li>
            <li>The layout is a layered application habitat, not a generic component catalog.</li>
          </ul>
          <Separator.Root className="nk-separator" decorative />
          <div className="nk-footer-callout">
            <span className="nk-section-tag mint">TOY-LIKE CLARITY</span>
            <p>Advanced systems become emotionally reassuring when status, commerce, and automation all share the same plush visual language.</p>
          </div>
        </article>
      </section>
    </div>
  );
}

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  select, input, textarea, button { appearance: none; -webkit-appearance: none; font: inherit; color: inherit; border: none; background: none; outline: none; }
  :root {
    --bg: #fff7fd;
    --bg-2: #fff1fb;
    --primary: #ff5fcf;
    --secondary: #7e7bff;
    --accent: #7cf7d4;
    --text: #34234d;
    --muted: #8b79a8;
    --surface: rgba(255,255,255,0.72);
    --surface-strong: rgba(255,255,255,0.84);
    --ring: rgba(255,255,255,0.96);
    --border: #e7d9ff;
    --pink-shadow: rgba(255,95,207,0.20);
    --violet-shadow: rgba(126,123,255,0.22);
    --mint-shadow: rgba(124,247,212,0.24);
    --shadow-md: 0 18px 44px rgba(136, 102, 196, 0.18);
    --shadow-lg: 0 28px 80px rgba(126, 123, 255, 0.22);
    --radius-sm: 14px;
    --radius-md: 22px;
    --radius-lg: 32px;
    --font-heading: 'Baloo 2', system-ui, sans-serif;
    --font-body: 'Nunito', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
  body {
    font-family: var(--font-body);
    background:
      radial-gradient(circle at 18% 18%, rgba(255, 95, 207, 0.20), transparent 28%),
      radial-gradient(circle at 84% 14%, rgba(126, 123, 255, 0.20), transparent 26%),
      radial-gradient(circle at 80% 78%, rgba(124, 247, 212, 0.18), transparent 24%),
      linear-gradient(180deg, #fffaff 0%, #fff5fd 48%, #fff7fd 100%);
    color: var(--text);
  }
  .nk-shell {
    min-height: 100vh;
    position: relative;
    overflow: hidden;
    padding: 32px;
  }
  .nk-shell::before {
    content: '';
    position: absolute;
    inset: 22px;
    border-radius: 40px;
    background: linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08));
    border: 2px solid rgba(255,255,255,0.58);
    pointer-events: none;
  }
  .nk-atmosphere, .nk-orbit, .nk-heart, .nk-sparkle {
    position: absolute;
    pointer-events: none;
  }
  .nk-grid {
    inset: 0;
    background-image: linear-gradient(rgba(255,255,255,0.34) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.34) 1px, transparent 1px);
    background-size: 46px 46px;
    mask-image: linear-gradient(to bottom, rgba(0,0,0,0.30), transparent 88%);
  }
  .nk-dots {
    inset: 0;
    background-image: radial-gradient(rgba(255,95,207,0.18) 1.5px, transparent 1.5px);
    background-size: 22px 22px;
    opacity: 0.65;
  }
  .nk-orbit {
    border: 2px dashed rgba(126,123,255,0.24);
    border-radius: 999px;
  }
  .nk-orbit-a { width: 520px; height: 520px; top: -110px; right: -120px; }
  .nk-orbit-b { width: 420px; height: 420px; bottom: -140px; left: -90px; }
  .nk-heart {
    width: 20px; height: 20px; background: rgba(255,95,207,0.25); transform: rotate(45deg);
    border-radius: 5px 5px 0 0;
  }
  .nk-heart::before, .nk-heart::after {
    content: '';
    position: absolute;
    width: 20px; height: 20px;
    background: rgba(255,95,207,0.25);
    border-radius: 50%;
  }
  .nk-heart::before { left: -10px; top: 0; }
  .nk-heart::after { left: 0; top: -10px; }
  .nk-heart-a { top: 120px; right: 290px; }
  .nk-heart-b { bottom: 150px; left: 280px; transform: rotate(45deg) scale(1.2); }
  .nk-sparkle { color: rgba(255,255,255,0.96); font-size: 30px; text-shadow: 0 0 18px rgba(255,95,207,0.32); }
  .nk-sparkle-a { top: 78px; left: 140px; }
  .nk-sparkle-b { bottom: 120px; right: 260px; }
  .nk-floating-badge {
    position: absolute;
    z-index: 2;
    padding: 10px 16px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.95);
    backdrop-filter: blur(14px);
    background: rgba(255,255,255,0.58);
    box-shadow: 0 14px 26px rgba(136, 102, 196, 0.14);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .pink { background-image: linear-gradient(135deg, rgba(255,95,207,0.22), rgba(255,255,255,0.75)); }
  .violet { background-image: linear-gradient(135deg, rgba(126,123,255,0.22), rgba(255,255,255,0.75)); }
  .mint { background-image: linear-gradient(135deg, rgba(124,247,212,0.24), rgba(255,255,255,0.75)); }
  .peach { background-image: linear-gradient(135deg, rgba(255,184,77,0.24), rgba(255,255,255,0.75)); }
  .nk-card, .nk-aside-card, .nk-inventory-card, .nk-bundle-card, .nk-feed-item, .nk-mini-card {
    position: relative;
    border: 2px solid var(--ring);
    border-radius: var(--radius-lg);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.60)),
      linear-gradient(135deg, rgba(255,95,207,0.10), rgba(126,123,255,0.08), rgba(124,247,212,0.08));
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow-md);
    overflow: hidden;
  }
  .nk-card::before, .nk-aside-card::before, .nk-inventory-card::before, .nk-bundle-card::before, .nk-feed-item::before, .nk-mini-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.22));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
  .nk-card::after, .nk-aside-card::after, .nk-inventory-card::after, .nk-bundle-card::after, .nk-feed-item::after, .nk-mini-card::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 16px;
    top: 10px;
    height: 28%;
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(255,255,255,0.58), transparent);
    pointer-events: none;
    filter: blur(0.4px);
  }
  .nk-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    padding: 24px 26px;
    margin-bottom: 24px;
  }
  .nk-brand-cluster { display: flex; align-items: center; gap: 18px; max-width: 880px; }
  .nk-mascot-chip {
    width: 88px; height: 88px; border-radius: 30px;
    border: 4px solid rgba(255,255,255,0.96);
    display: grid; place-items: center;
    background: linear-gradient(145deg, rgba(255,95,207,0.88), rgba(126,123,255,0.72), rgba(124,247,212,0.82));
    box-shadow: 0 18px 30px var(--pink-shadow);
    flex: 0 0 auto;
  }
  .nk-mascot-face { color: white; font-family: var(--font-heading); font-size: 22px; letter-spacing: 0.04em; }
  h1, h2, h3 { font-family: var(--font-heading); line-height: 1.02; }
  h1 { font-size: clamp(2rem, 3vw, 3.7rem); max-width: 14ch; }
  h2 { font-size: clamp(1.8rem, 2.4vw, 2.8rem); }
  h3 { font-size: clamp(1.35rem, 1.7vw, 1.85rem); }
  .nk-top-actions { display: flex; gap: 12px; align-items: center; }
  .nk-gummy-button {
    cursor: pointer;
    padding: 14px 22px;
    border-radius: 999px;
    border: 3px solid rgba(255,255,255,0.96);
    font-weight: 800;
    box-shadow: 0 10px 0 rgba(255,255,255,0.76), 0 18px 26px rgba(136, 102, 196, 0.14);
    transform: translateY(0px);
    transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .nk-gummy-button:hover { transform: translateY(-4px); box-shadow: 0 14px 0 rgba(255,255,255,0.78), 0 24px 32px rgba(136, 102, 196, 0.18); }
  .nk-gummy-button.ghost { background-color: rgba(255,255,255,0.52); }
  .nk-section-tag {
    display: inline-flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.94);
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--text);
    background: rgba(255,255,255,0.68);
    margin-bottom: 12px;
  }
  .nk-layout {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(320px, 5fr);
    gap: 24px;
    align-items: start;
  }
  .nk-hero-stack { display: grid; gap: 24px; }
  .nk-hero-panel { padding: 24px; }
  .nk-panel-heading {
    display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 20px;
  }
  .nk-panel-heading.compact { margin-bottom: 16px; }
  .nk-chip-row { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
  .nk-stat-chip, .nk-micro-pill, .nk-mini-status {
    display: inline-flex;
    align-items: center;
    padding: 10px 14px;
    border-radius: 999px;
    border: 3px solid rgba(255,255,255,0.94);
    background: rgba(255,255,255,0.68);
    font-weight: 800;
    box-shadow: 0 10px 18px rgba(136,102,196,0.10);
  }
  .nk-micro-pill { font-size: 12px; font-family: var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
  .nk-mini-status { font-size: 12px; padding: 8px 12px; }
  .nk-hero-content {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.8fr);
    gap: 18px;
    align-items: stretch;
  }
  .nk-device-stage {
    min-height: 440px;
    position: relative;
    padding: 18px;
    border-radius: 30px;
    border: 2px solid rgba(255,255,255,0.94);
    background: linear-gradient(160deg, rgba(255,255,255,0.42), rgba(255,255,255,0.20));
    overflow: hidden;
  }
  .nk-device-stage::before {
    content: '';
    position: absolute;
    inset: 16px;
    border-radius: 28px;
    border: 2px dashed rgba(126,123,255,0.22);
  }
  .nk-device-card {
    position: relative;
    width: min(100%, 460px);
    margin: 28px auto 0;
    padding: 18px;
    border-radius: 34px;
    border: 4px solid rgba(255,255,255,0.94);
    background: linear-gradient(160deg, rgba(255,95,207,0.30), rgba(126,123,255,0.28), rgba(124,247,212,0.24));
    box-shadow: var(--shadow-lg);
  }
  .nk-device-glow {
    position: absolute; inset: -8px; border-radius: 40px;
    background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.64), transparent 38%), radial-gradient(circle at 72% 76%, rgba(255,255,255,0.34), transparent 42%);
    filter: blur(6px);
  }
  .nk-device-screen {
    position: relative;
    min-height: 290px;
    padding: 20px;
    border-radius: 26px;
    overflow: hidden;
    background: linear-gradient(180deg, rgba(255,255,255,0.80), rgba(255,255,255,0.52));
    backdrop-filter: blur(22px);
  }
  .nk-screen-top { display: flex; justify-content: space-between; align-items: start; gap: 10px; margin-bottom: 20px; }
  .nk-wave-band {
    height: 42px;
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.94);
    margin-bottom: 14px;
  }
  .wave-one { width: 88%; background: linear-gradient(90deg, rgba(255,95,207,0.72), rgba(255,204,236,0.72)); }
  .wave-two { width: 76%; background: linear-gradient(90deg, rgba(126,123,255,0.72), rgba(194,190,255,0.74)); }
  .wave-three { width: 62%; background: linear-gradient(90deg, rgba(124,247,212,0.72), rgba(196,255,241,0.72)); }
  .nk-sticker-row { display: flex; gap: 10px; margin-top: 28px; flex-wrap: wrap; }
  .nk-sticker {
    padding: 10px 14px; border-radius: 999px; border: 3px solid rgba(255,255,255,0.96);
    background: rgba(255,255,255,0.72); font-weight: 800;
  }
  .nk-mini-card {
    position: absolute;
    max-width: 240px;
    padding: 16px;
  }
  .nk-mini-card strong { display: block; font-size: 0.98rem; line-height: 1.35; }
  .nk-mini-card.pink { top: 46px; right: 26px; }
  .nk-mini-card.mint { bottom: 24px; left: 24px; }
  .nk-mini-card.shift-up { transform: translateY(-6px); }
  .nk-hero-sidebar { display: grid; gap: 16px; }
  .nk-aside-card { padding: 18px; display: grid; align-content: end; min-height: 170px; }
  .nk-kpi-number { font-family: var(--font-heading); font-size: clamp(2.1rem, 3vw, 3rem); margin-bottom: 8px; }
  .nk-aside-card p, .nk-feed-item p, .nk-avatar-row p, .nk-switch-row p, .nk-progress-meta p, .nk-bundle-card p, .nk-footer-callout p, .nk-inventory-card p { color: var(--muted); line-height: 1.5; }
  .nk-activity-panel, .nk-commerce-panel, .nk-note-panel, .nk-rail-card { padding: 22px; }
  .nk-feed-list { display: grid; gap: 14px; }
  .nk-feed-item { display: grid; grid-template-columns: auto 1fr; gap: 14px; padding: 16px; align-items: start; }
  .nk-feed-badge {
    min-width: 104px;
    text-align: center;
    padding: 10px 12px;
    border-radius: 18px;
    border: 3px solid rgba(255,255,255,0.94);
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    background: rgba(255,255,255,0.68);
  }
  .nk-feed-item strong, .nk-avatar-row strong, .nk-switch-row strong, .nk-progress-meta strong, .nk-bundle-card strong { display: block; margin-bottom: 6px; }
  .nk-utility-rail { display: grid; gap: 24px; }
  .nk-avatar-stack, .nk-switch-list { display: grid; gap: 14px; }
  .nk-avatar-row, .nk-switch-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 14px;
    align-items: center;
    padding: 14px;
    border-radius: 24px;
    border: 2px solid rgba(255,255,255,0.90);
    background: rgba(255,255,255,0.58);
  }
  .nk-avatar {
    width: 64px; height: 64px; border-radius: 22px;
    display: grid; place-items: center;
    border: 4px solid rgba(255,255,255,0.96);
    font-family: var(--font-heading); font-size: 20px; color: white;
    box-shadow: 0 10px 22px rgba(136,102,196,0.16);
  }
  .nk-switch-row { grid-template-columns: 1fr auto; }
  .nk-switch-root {
    width: 72px; height: 42px; border-radius: 999px; position: relative;
    background: linear-gradient(90deg, rgba(255,95,207,0.72), rgba(126,123,255,0.70));
    border: 3px solid rgba(255,255,255,0.96);
    box-shadow: 0 10px 20px rgba(136,102,196,0.16);
  }
  .nk-switch-root.bubble { background: linear-gradient(90deg, rgba(124,247,212,0.90), rgba(126,123,255,0.60)); }
  .nk-switch-thumb {
    display: block;
    width: 28px; height: 28px; border-radius: 999px; background: white;
    box-shadow: 0 6px 14px rgba(136,102,196,0.18);
    transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    transform: translateX(6px);
    margin-top: 4px;
  }
  .nk-switch-root[data-state='checked'] .nk-switch-thumb { transform: translateX(34px); }
  .nk-progress-wrap {
    border-radius: 24px; border: 2px solid rgba(255,255,255,0.92); background: rgba(255,255,255,0.56); padding: 14px;
  }
  .nk-progress-root { position: relative; overflow: hidden; background: rgba(255,255,255,0.78); border-radius: 999px; height: 24px; border: 3px solid rgba(255,255,255,0.96); margin-bottom: 14px; }
  .nk-progress-indicator { width: 100%; height: 100%; background: linear-gradient(90deg, rgba(255,95,207,0.92), rgba(126,123,255,0.88), rgba(124,247,212,0.82)); border-radius: 999px; }
  .nk-bottom-grid {
    margin-top: 24px;
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.9fr);
    gap: 24px;
  }
  .nk-tabs-list {
    display: inline-grid;
    grid-auto-flow: column;
    gap: 10px;
    padding: 10px;
    background: rgba(255,255,255,0.54);
    border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.92);
    margin-bottom: 18px;
  }
  .nk-tab-trigger {
    cursor: pointer;
    padding: 12px 18px;
    border-radius: 999px;
    border: 2px solid transparent;
    font-weight: 800;
    color: var(--muted);
  }
  .nk-tab-trigger[data-state='active'] {
    color: var(--text);
    background: rgba(255,255,255,0.84);
    border-color: rgba(255,255,255,0.94);
    box-shadow: 0 8px 18px rgba(136,102,196,0.12);
  }
  .nk-inventory-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .nk-inventory-card, .nk-bundle-card { padding: 18px; min-height: 170px; }
  .nk-inventory-card strong { display: block; font-family: var(--font-heading); font-size: 2.4rem; margin-bottom: 6px; }
  .nk-bundle-card { display: grid; align-content: center; }
  .nk-dna-list { list-style: none; display: grid; gap: 12px; }
  .nk-dna-list li {
    padding: 14px 16px 14px 50px;
    position: relative;
    border-radius: 22px;
    border: 2px solid rgba(255,255,255,0.90);
    background: rgba(255,255,255,0.58);
    line-height: 1.5;
  }
  .nk-dna-list li::before {
    content: '✦';
    position: absolute; left: 16px; top: 12px;
    width: 24px; height: 24px; border-radius: 999px;
    display: grid; place-items: center;
    background: linear-gradient(135deg, rgba(255,95,207,0.62), rgba(126,123,255,0.64));
    color: white;
    border: 2px solid rgba(255,255,255,0.94);
  }
  .nk-separator { height: 2px; background: linear-gradient(90deg, rgba(255,95,207,0.42), rgba(126,123,255,0.38), rgba(124,247,212,0.40)); margin: 18px 0; }
  .nk-footer-callout {
    padding: 16px;
    border-radius: 24px;
    border: 2px solid rgba(255,255,255,0.92);
    background: rgba(255,255,255,0.60);
  }
  @media (max-width: 1279px) {
    .nk-shell { padding: 24px; }
    .nk-layout { grid-template-columns: 1fr; }
    .nk-bottom-grid { grid-template-columns: 1fr; }
    .nk-topbar { flex-direction: column; align-items: stretch; }
    .nk-top-actions { justify-content: flex-start; flex-wrap: wrap; }
    .nk-floating-badge { transform: scale(0.92); }
  }
  @media (max-width: 980px) {
    .nk-hero-content { grid-template-columns: 1fr; }
    .nk-inventory-grid { grid-template-columns: 1fr; }
    .nk-brand-cluster { align-items: flex-start; }
    .nk-mascot-chip { width: 76px; height: 76px; }
  }
  @media (max-width: 759px) {
    .nk-shell { padding: 16px; }
    .nk-shell::before { inset: 10px; border-radius: 26px; }
    .nk-topbar, .nk-hero-panel, .nk-activity-panel, .nk-commerce-panel, .nk-note-panel, .nk-rail-card { padding: 18px; }
    .nk-floating-badge { display: none; }
    .nk-panel-heading, .nk-brand-cluster { flex-direction: column; align-items: flex-start; }
    .nk-chip-row { justify-content: flex-start; }
    .nk-avatar-row { grid-template-columns: auto 1fr; }
    .nk-mini-status { grid-column: 2; width: fit-content; }
    .nk-device-stage { min-height: 400px; }
    .nk-mini-card { position: static; margin-top: 14px; max-width: none; }
  }
`;

export { NeoKawaiiTechEmbodiment as NeoKawaiiTechRadix };
